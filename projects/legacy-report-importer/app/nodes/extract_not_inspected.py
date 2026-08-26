"""
Node 8: Extract Not-Inspected Items

Finds items the inspector noted they could not or did not inspect.
Maps to the NotInspectedObservation table in the sibling project.
"""

from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from ..config import get_llm
from ..prompts import EXTRACT_NOT_INSPECTED_PROMPT
from ..state import ImportState


class SingleNotInspected(BaseModel):
    system: str
    component: str
    room_or_area: str = ""
    reason: str       # maps to NotInspectedReason enum values
    description: str
    approximate_page: int = 0


class NotInspectedList(BaseModel):
    items: list[SingleNotInspected]


def run(state: ImportState) -> dict:
    errors = list(state.get("errors", []))
    text = state.get("scrubbed_text", state.get("raw_text", ""))

    prompt = EXTRACT_NOT_INSPECTED_PROMPT.format(text=text[:8000])
    llm = get_llm().with_structured_output(NotInspectedList)

    try:
        result: NotInspectedList = llm.invoke([HumanMessage(content=prompt)])
        not_inspected = [item.model_dump() for item in result.items]
        print(f"[extract_not_inspected] {len(not_inspected)} not-inspected items found")
    except Exception as e:
        errors.append(f"Not-inspected extraction failed: {e}")
        not_inspected = []

    return {"not_inspected": not_inspected, "errors": errors}
