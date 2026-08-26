"""
LangGraph state definition. Every node receives the full state and returns
a partial dict — LangGraph merges updates automatically.
"""

from typing import Optional, TypedDict


class ImageInfo(TypedDict):
    index: int
    page_num: int
    bbox: tuple                # (x0, y0, x1, y1) from pymupdf
    page_text_context: str     # surrounding text on the same page (for location matching)
    bytes_b64: str             # base64-encoded image bytes
    ext: str                   # "jpeg", "png", etc.
    # Populated by image_describer node
    description: Optional[str]
    likely_system: Optional[str]   # e.g. "Roofing", "Electrical"
    visible_defect: Optional[bool]
    skip: Optional[bool]           # True = logo / signature / non-inspection image
    skip_reason: Optional[str]


class ExtractedObservation(TypedDict):
    title: str
    room_or_area: str
    system: str
    component: str
    defect_type: str
    severity: str               # "Advisory" | "Deficiency" | "Safety Hazard"
    sub_category: str
    safety_related: bool
    professional_report_description: str
    plain_english_summary: str
    recommended_action: str
    responsible_professional: str
    estimated_cost_range: str
    confidence: float
    approximate_page: int       # page where this finding appeared — used for image matching
    image_indices: list         # populated by image_matcher node


class ExtractedNotInspected(TypedDict):
    system: str
    component: str
    room_or_area: str
    reason: str
    description: str
    approximate_page: int


class ImportState(TypedDict):
    # Input
    pdf_path: str

    # pdf_loader outputs
    raw_text: str
    pages: list               # [{page_num, text}]
    images: list              # list[ImageInfo]

    # pii_scrubber outputs
    scrubbed_text: str
    extracted_pii: dict       # {client_name, address, inspector_name, ...}

    # layout_classifier output
    layout_type: str          # "inline" | "gallery" | "unknown"

    # extract_header output
    inspection_header: dict   # maps to Inspection table fields

    # extract_observations output
    observations: list        # list[ExtractedObservation]

    # extract_not_inspected output
    not_inspected: list       # list[ExtractedNotInspected]

    # validator output
    validation_flags: list    # [{observation_index, field, issue}]
    human_review_needed: bool

    # db_writer output
    db_result: dict           # {inspection_id, observation_ids, errors}

    # Global error log
    errors: list
