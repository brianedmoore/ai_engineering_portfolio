"""
Node 6: Extract Observations

Extracts every finding from the report as a list of StructuredObservation-compatible dicts.

For large reports (>8000 chars), we chunk the text by page and run extraction per chunk,
then deduplicate. This avoids hitting context limits and improves per-finding accuracy.

Reuses enum values from the sibling project's schemas to stay in sync with the data model.
"""

from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage

from ..config import get_llm
from ..prompts import EXTRACT_OBSERVATIONS_PROMPT
from ..state import ImportState

# Import enums from sibling project for validation (sys.path set in config.py)
from app.schemas import HomeSystem, Severity, SubCategory, ResponsibleProfessional, EstimatedCostRange

CHUNK_SIZE_CHARS = 7000
CHUNK_OVERLAP_CHARS = 500


class SingleObservation(BaseModel):
    title: str
    room_or_area: str = ""
    system: str
    component: str
    defect_type: str
    severity: str
    sub_category: str
    safety_related: bool
    professional_report_description: str
    plain_english_summary: str
    recommended_action: str
    responsible_professional: str
    estimated_cost_range: str
    confidence: float = Field(ge=0.0, le=1.0)
    approximate_page: int = 0


class ObservationList(BaseModel):
    observations: list[SingleObservation]


def _extract_from_chunk(llm, chunk: str) -> list[SingleObservation]:
    prompt = EXTRACT_OBSERVATIONS_PROMPT.format(text=chunk)
    try:
        result: ObservationList = llm.invoke([HumanMessage(content=prompt)])
        return result.observations
    except Exception:
        return []


def _deduplicate(observations: list[dict]) -> list[dict]:
    """
    Remove near-duplicates by title similarity. Simple exact-match on lowercased title
    for now — good enough for the import use case.
    """
    seen_titles: set[str] = set()
    unique = []
    for obs in observations:
        key = obs["title"].lower().strip()
        if key not in seen_titles:
            seen_titles.add(key)
            unique.append(obs)
    return unique


def run(state: ImportState) -> dict:
    errors = list(state.get("errors", []))
    text = state.get("scrubbed_text", state.get("raw_text", ""))

    llm = get_llm().with_structured_output(ObservationList)
    all_observations: list[dict] = []

    if len(text) <= CHUNK_SIZE_CHARS:
        chunks = [text]
    else:
        # Sliding window chunks to avoid cutting a finding in half at a boundary
        chunks = []
        start = 0
        while start < len(text):
            end = start + CHUNK_SIZE_CHARS
            chunks.append(text[start:end])
            start += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS

    for i, chunk in enumerate(chunks):
        extracted = _extract_from_chunk(llm, chunk)
        for obs in extracted:
            all_observations.append({
                **obs.model_dump(),
                "image_indices": [],  # populated by image_matcher
            })
        print(f"[extract_observations] Chunk {i+1}/{len(chunks)}: {len(extracted)} findings")

    deduped = _deduplicate(all_observations)
    print(f"[extract_observations] Total: {len(deduped)} observations after dedup (from {len(all_observations)})")

    return {"observations": deduped, "errors": errors}
