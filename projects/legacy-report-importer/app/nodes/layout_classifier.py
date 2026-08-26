"""
Node 3: Layout Classifier

Determines whether photos are placed INLINE (near findings) or in a GALLERY (grouped at end).
Uses a heuristic first — only calls the LLM if the heuristic is ambiguous.

This classification routes the image_matcher to the right strategy:
  inline  → location-first matching (fast, reliable)
  gallery → description-only matching (more LLM calls, needed for older report formats)
"""

from typing import Literal
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from ..config import get_llm
from ..prompts import LAYOUT_CLASSIFY_PROMPT
from ..state import ImportState


class LayoutClassification(BaseModel):
    layout_type: Literal["inline", "gallery", "unknown"]
    reasoning: str


def _heuristic_classify(images: list, pages: list) -> str | None:
    """
    If >65% of images are on the last 20% of pages, it's almost certainly a gallery.
    Returns a classification string or None if ambiguous.
    """
    if not images or not pages:
        return "unknown"

    total_pages = len(pages)
    gallery_threshold_page = int(total_pages * 0.80)
    images_in_last_section = sum(1 for img in images if img["page_num"] >= gallery_threshold_page)
    ratio = images_in_last_section / len(images)

    if ratio >= 0.65:
        return "gallery"
    if ratio <= 0.25:
        return "inline"
    return None  # ambiguous — fall through to LLM


def run(state: ImportState) -> dict:
    errors = list(state.get("errors", []))
    images = state.get("images", [])
    pages = state.get("pages", [])

    # Try heuristic first
    heuristic_result = _heuristic_classify(images, pages)
    if heuristic_result is not None:
        print(f"[layout_classifier] Heuristic → {heuristic_result}")
        return {"layout_type": heuristic_result, "errors": errors}

    # Ambiguous — ask the LLM
    image_distribution = {}
    for img in images:
        p = img["page_num"]
        image_distribution[p] = image_distribution.get(p, 0) + 1

    prompt = LAYOUT_CLASSIFY_PROMPT.format(
        text=state.get("scrubbed_text", "")[:2000],
        page_count=len(pages),
        image_distribution=str(image_distribution),
    )

    llm = get_llm().with_structured_output(LayoutClassification)

    try:
        result: LayoutClassification = llm.invoke([HumanMessage(content=prompt)])
        layout_type = result.layout_type
        print(f"[layout_classifier] LLM → {layout_type} | {result.reasoning}")
    except Exception as e:
        errors.append(f"Layout classification failed: {e}")
        layout_type = "unknown"

    return {"layout_type": layout_type, "errors": errors}
