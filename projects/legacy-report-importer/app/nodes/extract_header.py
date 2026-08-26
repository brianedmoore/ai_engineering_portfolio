"""
Node 5: Extract Inspection Header

Extracts the Inspection table fields from the scrubbed report text:
  - Property metadata (address, date, property_type)
  - System descriptor fields (roof_material, hvac_system_type, etc.)

Reuses SYSTEM_DESCRIPTORS and build_llm_extraction_prompt() from the sibling project
so the field list stays in one place.
"""

from typing import Optional, Any
from pydantic import BaseModel, Field, create_model
from langchain_core.messages import HumanMessage

from ..config import get_llm
from ..prompts import EXTRACT_HEADER_PROMPT
from ..state import ImportState

# Import from sibling project (sys.path set up in config.py)
from app.system_descriptors import SYSTEM_DESCRIPTORS, build_llm_extraction_prompt


def _build_header_model() -> type[BaseModel]:
    """
    Dynamically build a Pydantic model matching the Inspection table's system descriptor
    columns. Field list comes directly from SYSTEM_DESCRIPTORS — no manual sync needed.
    """
    fields: dict[str, Any] = {
        "address": (Optional[str], Field(default=None)),
        "property_type": (Optional[str], Field(default=None)),
        "inspection_date": (Optional[str], Field(default=None)),
        "notes": (Optional[str], Field(default=None)),
    }

    for system, field_defs in SYSTEM_DESCRIPTORS.items():
        for field_key, defn in field_defs.items():
            col_name = f"{system}_{field_key}"
            field_type = defn.get("type")
            if field_type == "number":
                fields[col_name] = (Optional[float], Field(default=None))
            elif field_type == "boolean":
                fields[col_name] = (Optional[bool], Field(default=None))
            else:
                fields[col_name] = (Optional[str], Field(default=None))

    return create_model("InspectionHeader", **fields)


InspectionHeader = _build_header_model()


def run(state: ImportState) -> dict:
    errors = list(state.get("errors", []))
    text = state.get("scrubbed_text", state.get("raw_text", ""))

    system_descriptors_section = build_llm_extraction_prompt()
    prompt = EXTRACT_HEADER_PROMPT.format(
        text=text[:6000],
        system_descriptors_section=system_descriptors_section,
    )

    llm = get_llm().with_structured_output(InspectionHeader)

    try:
        result = llm.invoke([HumanMessage(content=prompt)])
        header = result.model_dump(exclude_none=True)

        # If PII scrubber got the address and the LLM didn't, use the PII version
        pii = state.get("extracted_pii", {})
        if not header.get("address") and pii.get("property_address"):
            header["address"] = pii["property_address"]
        if not header.get("inspection_date") and pii.get("inspection_date"):
            header["inspection_date"] = pii["inspection_date"]

        print(f"[extract_header] address={header.get('address')}, {len(header)} fields extracted")
    except Exception as e:
        errors.append(f"Header extraction failed: {e}")
        header = {}

    return {"inspection_header": header, "errors": errors}
