"""
Node 9: Validator

Checks extraction quality and routes the graph:
  - High confidence → db_writer (automatic import)
  - Low confidence  → human_review (inspector confirms before writing)

Also normalizes enum values to match the sibling project's exact strings.
"""

from ..state import ImportState

CONFIDENCE_THRESHOLD = 0.65

# Valid enum values — must stay in sync with sibling project schemas.py
VALID_SYSTEMS = {
    "Roofing", "Exterior", "Structure", "Electrical", "Plumbing",
    "HVAC", "Interior", "Insulation and Ventilation", "Appliances",
    "Site and Grounds", "Garage", "Other",
}
VALID_SEVERITIES = {"Advisory", "Deficiency", "Safety Hazard"}
VALID_SUBCATEGORIES = {
    "Immediate Safety", "Safety Upgrade",
    "Major Repair", "Repair / Replace", "Evaluate", "End of Life",
    "Maintenance", "Monitor", "Informational",
}


def _normalize(value: str, valid_set: set[str], fallback: str) -> str:
    if value in valid_set:
        return value
    # Case-insensitive match
    for valid in valid_set:
        if valid.lower() == value.lower():
            return valid
    return fallback


def _validate_observation(obs: dict, index: int) -> list[dict]:
    flags = []

    if obs.get("confidence", 1.0) < CONFIDENCE_THRESHOLD:
        flags.append({
            "observation_index": index,
            "field": "confidence",
            "issue": f"Low confidence: {obs['confidence']:.2f}",
        })

    if obs.get("system") not in VALID_SYSTEMS:
        flags.append({
            "observation_index": index,
            "field": "system",
            "issue": f"Unrecognized system: '{obs.get('system')}' — will default to 'Other'",
        })

    if obs.get("severity") not in VALID_SEVERITIES:
        flags.append({
            "observation_index": index,
            "field": "severity",
            "issue": f"Unrecognized severity: '{obs.get('severity')}' — will default to 'Advisory'",
        })

    return flags


def run(state: ImportState) -> dict:
    errors = list(state.get("errors", []))
    observations = state.get("observations", [])
    all_flags = []

    normalized_observations = []
    for i, obs in enumerate(observations):
        normalized = dict(obs)
        normalized["system"] = _normalize(obs.get("system", ""), VALID_SYSTEMS, "Other")
        normalized["severity"] = _normalize(obs.get("severity", ""), VALID_SEVERITIES, "Advisory")
        normalized["sub_category"] = _normalize(obs.get("sub_category", ""), VALID_SUBCATEGORIES, "Informational")
        normalized_observations.append(normalized)
        all_flags.extend(_validate_observation(normalized, i))

    # Require human review if any low-confidence findings or missing required fields
    needs_review = len(all_flags) > 0 or not state.get("inspection_header", {}).get("address")

    print(f"[validator] {len(all_flags)} flags raised — human_review_needed={needs_review}")
    for flag in all_flags[:5]:  # print first 5
        print(f"  obs[{flag['observation_index']}] {flag['field']}: {flag['issue']}")

    return {
        "observations": normalized_observations,
        "validation_flags": all_flags,
        "human_review_needed": needs_review,
        "errors": errors,
    }
