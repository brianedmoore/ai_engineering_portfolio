"""
System descriptor schema. Defines all system-level fields collected per inspection.

This config is the single source of truth for:
  - House Profile form UI  (auto-rendered from field definitions)
  - LLM extraction prompt  (tells the model exactly what to look for per system)
  - Pre-report validation  (cross-referenced with REQUIRED_FOR_REPORT in rules.py)
  - Source tracking        (inferred vs confirmed, stored per field on Inspection)

To add a new field: add it here. Nothing else needs to change.
To add a new system: add a new top-level key. The form and prompt pick it up.
"""

from typing import TypedDict, Literal, Optional

FieldType = Literal["enum", "number", "string", "boolean"]


class FieldDefinition(TypedDict, total=False):
    label: str          # Human-readable label shown in the form
    type: FieldType
    options: list[str]  # Required when type == "enum"
    note: str           # Optional inspector guidance shown in the form
    unit: str           # Optional unit hint (e.g. "years", "gallons", "PSI")


# ---------------------------------------------------------------------------
# SYSTEM_DESCRIPTORS
#
# Top-level keys are system names (matching Inspection column prefixes).
# Each system contains a dict of field_key -> FieldDefinition.
#
# Column naming convention on the Inspection model:
#   {system}_{field_key}   e.g.  hvac_system_type, roof_estimated_age_years
# ---------------------------------------------------------------------------
SYSTEM_DESCRIPTORS: dict[str, dict[str, FieldDefinition]] = {

    "roof": {
        "material": {
            "label": "Roofing Material",
            "type": "enum",
            "options": [
                "Asphalt Shingle",
                "Architectural Shingle",
                "Metal",
                "Tile",
                "Wood Shake",
                "Flat / TPO",
                "Flat / Modified Bitumen",
                "Built-Up",
                "Other",
            ],
        },
        "estimated_age_years": {
            "label": "Estimated Age",
            "type": "number",
            "unit": "years",
        },
        "layers": {
            "label": "Layers",
            "type": "enum",
            "options": ["1", "2", "3+"],
            "note": "3+ layers typically require full tear-off at next replacement.",
        },
    },

    "hvac": {
        "system_type": {
            "label": "System Type",
            "type": "enum",
            "options": [
                "Forced Air",
                "Heat Pump",
                "Radiant / Hydronic",
                "Mini-Split",
                "Window Units",
                "Evaporative Cooler",
                "Other",
            ],
        },
        "fuel_type": {
            "label": "Fuel Type",
            "type": "enum",
            "options": ["Natural Gas", "Electric", "Propane", "Oil", "Other"],
        },
        "estimated_age_years": {
            "label": "Estimated Age",
            "type": "number",
            "unit": "years",
            "note": "Check data plate on the unit. Manufacture date is encoded in the serial number for most brands.",
        },
        "filter_condition": {
            "label": "Filter Condition",
            "type": "enum",
            "options": ["Clean", "Dirty", "Missing", "Not Accessible"],
        },
    },

    "water_heater": {
        "fuel_type": {
            "label": "Fuel / Type",
            "type": "enum",
            "options": [
                "Natural Gas",
                "Electric",
                "Propane",
                "Tankless - Gas",
                "Tankless - Electric",
                "Heat Pump",
                "Solar",
                "Other",
            ],
        },
        "estimated_age_years": {
            "label": "Estimated Age",
            "type": "number",
            "unit": "years",
            "note": "Manufacture date encoded in serial number. First 4 digits often YYWW (year/week).",
        },
        "capacity_gallons": {
            "label": "Tank Capacity",
            "type": "number",
            "unit": "gallons",
        },
    },

    "electrical": {
        "panel_amperage": {
            "label": "Panel Amperage",
            "type": "enum",
            "options": ["60A", "100A", "150A", "200A", "400A", "Unknown"],
        },
        "panel_manufacturer": {
            "label": "Panel Manufacturer",
            "type": "string",
            "note": "Flag if Federal Pacific, Zinsco, Pushmatic, Sylvania, or Challenger — these have documented safety concerns.",
        },
        "wiring_type": {
            "label": "Wiring Type",
            "type": "enum",
            "options": [
                "Copper",
                "Aluminum (pre-1972)",
                "Aluminum (modern)",
                "Knob & Tube",
                "Mixed",
            ],
        },
        "gfci_present": {
            "label": "GFCI Protection Present",
            "type": "boolean",
            "note": "Required in kitchens, bathrooms, garages, and exterior outlets.",
        },
    },

    "foundation": {
        "type": {
            "label": "Foundation Type",
            "type": "enum",
            "options": [
                "Slab",
                "Crawl Space",
                "Full Basement",
                "Partial Basement",
                "Pier & Beam",
                "Other",
            ],
        },
        "material": {
            "label": "Foundation Material",
            "type": "enum",
            "options": [
                "Poured Concrete",
                "Concrete Block",
                "Brick",
                "Stone",
                "Treated Wood",
                "Other",
            ],
        },
    },

    "plumbing": {
        "supply_material": {
            "label": "Supply Pipe Material",
            "type": "enum",
            "options": [
                "Copper",
                "PEX",
                "CPVC",
                "Galvanized Steel",
                "Polybutylene",
                "Mixed",
            ],
            "note": "Polybutylene was recalled — flag for replacement.",
        },
        "drain_material": {
            "label": "Drain / Waste Pipe Material",
            "type": "enum",
            "options": ["ABS", "PVC", "Cast Iron", "Galvanized", "Mixed"],
        },
        "water_pressure_psi": {
            "label": "Water Pressure",
            "type": "number",
            "unit": "PSI",
            "note": "Normal range is 40–80 PSI. Above 80 requires a pressure reducing valve.",
        },
    },

    "exterior": {
        "siding_material": {
            "label": "Siding Material",
            "type": "enum",
            "options": [
                "Vinyl",
                "Fiber Cement",
                "Wood",
                "Brick",
                "Stucco",
                "EIFS / Synthetic Stucco",
                "Stone",
                "Metal",
                "Other",
            ],
        },
        "driveway_material": {
            "label": "Driveway Material",
            "type": "enum",
            "options": ["Concrete", "Asphalt", "Gravel", "Paver", "Other"],
        },
    },
}


# ---------------------------------------------------------------------------
# Helper utilities — consumed by the LLM prompt builder and form renderer.
# ---------------------------------------------------------------------------

def get_all_column_names() -> list[str]:
    """Return every Inspection column name derived from SYSTEM_DESCRIPTORS."""
    cols = []
    for system, fields in SYSTEM_DESCRIPTORS.items():
        for field_key in fields:
            cols.append(f"{system}_{field_key}")
    return cols


def get_enum_options(system: str, field_key: str) -> Optional[list[str]]:
    """Return valid enum options for a field, or None if not an enum."""
    field = SYSTEM_DESCRIPTORS.get(system, {}).get(field_key, {})
    if field.get("type") == "enum":
        return field.get("options")
    return None


def build_llm_extraction_prompt() -> str:
    """
    Generate the system-profile extraction section of the LLM prompt.
    Tells the model exactly which fields to look for and what values are valid.
    Called by prompts.py — do not hard-code field lists there.
    """
    lines = [
        "Also extract any system-level information present in the observation.",
        "Return a `system_profile_updates` dict with only the fields you can confidently determine.",
        "Use null for fields you cannot determine. Valid fields and their allowed values:\n",
    ]
    for system, fields in SYSTEM_DESCRIPTORS.items():
        for field_key, defn in fields.items():
            col = f"{system}_{field_key}"
            if defn.get("type") == "enum":
                opts = ", ".join(f'"{o}"' for o in defn["options"])
                lines.append(f'  "{col}": one of [{opts}]')
            elif defn.get("type") == "number":
                unit = defn.get("unit", "")
                lines.append(f'  "{col}": number ({unit})' if unit else f'  "{col}": number')
            elif defn.get("type") == "string":
                lines.append(f'  "{col}": string')
            elif defn.get("type") == "boolean":
                lines.append(f'  "{col}": true or false')
    return "\n".join(lines)
