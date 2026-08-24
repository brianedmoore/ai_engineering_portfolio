"""
End-of-life rules engine. Pure logic — no DB access, no LLM calls.

Consumes two values the LLM extracts from an observation:
  - component_key:        a key from EOL_LIFESPANS (e.g. "water_heater", "hvac")
  - detected_age_years:   estimated age in years, or None if no evidence found

Returns three values written to StructuredObservation:
  - approaching_end_of_life:  True / False / None
  - eol_source:               EolSource.UNKNOWN | INFERRED | CONFIRMED
  - eol_reasoning:            human-readable explanation, or None

CONFIRMED is set only by the inspector during review (via PATCH), never here.
To update thresholds: edit EOL_LIFESPANS in rules.py. Nothing else changes.
"""

from typing import Optional
from .rules import EOL_LIFESPANS, FLAGGED_MANUFACTURERS
from .schemas import EolSource


def assess_eol(
    component_key: Optional[str],
    detected_age_years: Optional[float],
) -> tuple[Optional[bool], EolSource, Optional[str]]:
    """
    Apply lifespan rules to LLM-extracted age data.

    Returns (approaching_end_of_life, eol_source, eol_reasoning).

    Cases:
      - No component key or no age detected → (None, UNKNOWN, None)
      - Component key not in rules          → (None, UNKNOWN, None)
      - Age within lifespan                 → (False, INFERRED, reasoning)
      - Age >= warn threshold               → (True,  INFERRED, reasoning)
      - Age >= max lifespan                 → (True,  INFERRED, reasoning — "exceeded")
    """
    if not component_key or detected_age_years is None:
        return None, EolSource.UNKNOWN, None

    rules = EOL_LIFESPANS.get(component_key)
    if not rules:
        return None, EolSource.UNKNOWN, None

    min_y: int = rules["min_years"]
    max_y: int = rules["max_years"]
    warn_at: float = max_y * rules["warn_fraction"]
    age: float = detected_age_years

    label = _component_label(component_key)
    lifespan = f"Typical lifespan: {min_y}–{max_y} years."
    age_str = f"{age:.0f}" if age == int(age) else f"{age:.1f}"

    if age >= max_y:
        reasoning = (
            f"{label}: estimated {age_str} years old. "
            f"{lifespan} Exceeded typical lifespan — replacement likely needed."
        )
        return True, EolSource.INFERRED, reasoning

    if age >= warn_at:
        reasoning = (
            f"{label}: estimated {age_str} years old. "
            f"{lifespan} Approaching end of typical lifespan — budget for replacement."
        )
        return True, EolSource.INFERRED, reasoning

    reasoning = (
        f"{label}: estimated {age_str} years old. "
        f"{lifespan} Within typical lifespan."
    )
    return False, EolSource.INFERRED, reasoning


def check_flagged_manufacturer(
    system_category: str,
    manufacturer: Optional[str],
) -> Optional[str]:
    """
    Return a warning string if manufacturer is on the flagged list, else None.

    system_category must match a key in FLAGGED_MANUFACTURERS
    (e.g. "electrical_panel", "plumbing_pipe").

    Used by observation_factory to elevate severity or add a report note.
    """
    if not manufacturer:
        return None

    flagged = FLAGGED_MANUFACTURERS.get(system_category, [])
    manufacturer_lower = manufacturer.lower()

    for flagged_name in flagged:
        if flagged_name.lower() in manufacturer_lower:
            return (
                f"{manufacturer} is a flagged manufacturer. "
                f"This {system_category.replace('_', ' ')} has documented safety concerns — "
                f"recommend evaluation by a licensed electrician."
            )
    return None


def _component_label(component_key: str) -> str:
    """Convert a snake_case component key to a readable label."""
    overrides = {
        "hvac": "HVAC system",
        "hvac_filter_condition": "HVAC filter",
        "roof_asphalt_shingle": "Asphalt shingle roof",
        "roof_architectural_shingle": "Architectural shingle roof",
        "roof_flat_tpo": "TPO flat roof",
        "roof_flat_modified_bitumen": "Modified bitumen roof",
        "roof_built_up": "Built-up roof",
        "roof_wood_shake": "Wood shake roof",
        "tankless_water_heater": "Tankless water heater",
        "mini_split": "Mini-split system",
        "oven_range": "Oven/range",
        "sump_pump": "Sump pump",
        "electrical_panel": "Electrical panel",
        "smoke_detector": "Smoke detector",
        "carbon_monoxide_detector": "Carbon monoxide detector",
        "garage_door_opener": "Garage door opener",
        "pressure_relief_valve": "Pressure relief valve",
    }
    if component_key in overrides:
        return overrides[component_key]
    return component_key.replace("_", " ").title()
