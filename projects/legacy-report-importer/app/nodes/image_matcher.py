"""
Node 7: Image Matcher

Assigns each inspection photo to the observation it documents.

Two strategies based on layout_type from layout_classifier:

  INLINE:  For each observation, find images on the same/adjacent pages (location filter),
           then ask the LLM which of those candidates actually match (confirmation step).
           Fast — most observations have 0-3 candidate images nearby.

  GALLERY: All photos are grouped separately. Pure description matching — send all
           observations + image descriptions to the LLM as a batch assignment problem.

  UNKNOWN: Falls back to GALLERY strategy (more conservative).
"""

from typing import Optional
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from ..config import get_llm
from ..prompts import MATCH_IMAGES_INLINE_PROMPT, MATCH_IMAGES_GALLERY_PROMPT
from ..state import ImportState

PAGE_WINDOW = 1  # how many pages before/after an observation to look for inline images


# ── Inline strategy ──────────────────────────────────────────────────────────

class InlineMatchResult(BaseModel):
    matching_indices: list[int]


def _inline_candidates(obs: dict, images: list[dict]) -> list[dict]:
    page = obs.get("approximate_page", 0)
    return [
        img for img in images
        if not img.get("skip") and abs(img["page_num"] - page) <= PAGE_WINDOW
    ]


def _match_inline(llm, obs: dict, candidates: list[dict]) -> list[int]:
    if not candidates:
        return []

    candidate_lines = "\n".join(
        f"  [{img['index']}] \"{img['description']}\" (page {img['page_num']})"
        for img in candidates
    )
    prompt = MATCH_IMAGES_INLINE_PROMPT.format(
        title=obs["title"],
        component=obs["component"],
        system=obs["system"],
        description=obs["professional_report_description"],
        page=obs.get("approximate_page", "?"),
        candidates=candidate_lines,
    )
    try:
        result: InlineMatchResult = llm.invoke([HumanMessage(content=prompt)])
        return result.matching_indices
    except Exception:
        return []


# ── Gallery strategy ─────────────────────────────────────────────────────────

class GalleryAssignment(BaseModel):
    assignments: dict[str, Optional[int]]  # image_index (str key) -> observation_index or null


def _match_gallery(llm, observations: list[dict], images: list[dict]) -> dict[int, int]:
    inspection_images = [img for img in images if not img.get("skip")]
    if not inspection_images:
        return {}

    findings_text = "\n".join(
        f"  [{i}] {obs['title']} — {obs['system']} — {obs['professional_report_description'][:120]}"
        for i, obs in enumerate(observations)
    )
    images_text = "\n".join(
        f"  [{img['index']}] \"{img['description']}\""
        for img in inspection_images
    )
    prompt = MATCH_IMAGES_GALLERY_PROMPT.format(
        findings=findings_text,
        images=images_text,
    )
    try:
        result: GalleryAssignment = llm.invoke([HumanMessage(content=prompt)])
        # Convert string keys back to ints
        return {
            int(img_idx): obs_idx
            for img_idx, obs_idx in result.assignments.items()
            if obs_idx is not None
        }
    except Exception:
        return {}


# ── Node entry point ──────────────────────────────────────────────────────────

def run(state: ImportState) -> dict:
    errors = list(state.get("errors", []))
    observations = state.get("observations", [])
    images = state.get("images", [])
    layout_type = state.get("layout_type", "unknown")

    if not observations or not images:
        return {"observations": observations, "errors": errors}

    llm = get_llm().with_structured_output(
        InlineMatchResult if layout_type == "inline" else GalleryAssignment
    )

    updated_observations = [dict(obs) for obs in observations]

    if layout_type == "inline":
        total_matched = 0
        for obs in updated_observations:
            candidates = _inline_candidates(obs, images)
            matched = _match_inline(llm, obs, candidates)
            obs["image_indices"] = matched
            total_matched += len(matched)
        print(f"[image_matcher] inline strategy: {total_matched} photo-observation links created")

    else:  # gallery or unknown
        llm_gallery = get_llm().with_structured_output(GalleryAssignment)
        assignment_map = _match_gallery(llm_gallery, updated_observations, images)
        for img_idx, obs_idx in assignment_map.items():
            if 0 <= obs_idx < len(updated_observations):
                updated_observations[obs_idx]["image_indices"].append(img_idx)
        print(f"[image_matcher] gallery strategy: {len(assignment_map)} images assigned")

    return {"observations": updated_observations, "errors": errors}
