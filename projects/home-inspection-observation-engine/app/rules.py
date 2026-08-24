"""
Central rules configuration. Update thresholds, flags, and requirements here.
Changes here propagate automatically to EOL assessment, validation, and report generation.
Nothing else in the codebase should hard-code these values.
"""

# ---------------------------------------------------------------------------
# End-of-life lifespans by component type.
#
# warn_fraction: flag as "approaching end of life" when age exceeds
#                (max_years * warn_fraction). Example: max=15, fraction=0.80
#                means flag at 12+ years.
#
# Keys are canonical component identifiers used by eol_engine.py.
# The LLM is instructed to return one of these keys when it detects a
# component with an estimable age.
# ---------------------------------------------------------------------------
EOL_LIFESPANS: dict[str, dict] = {
    # HVAC
    "hvac":                         {"min_years": 15, "max_years": 20, "warn_fraction": 0.80},
    "furnace":                      {"min_years": 15, "max_years": 25, "warn_fraction": 0.80},
    "heat_pump":                    {"min_years": 10, "max_years": 15, "warn_fraction": 0.80},
    "air_conditioner":              {"min_years": 10, "max_years": 15, "warn_fraction": 0.80},
    "boiler":                       {"min_years": 15, "max_years": 30, "warn_fraction": 0.80},
    "mini_split":                   {"min_years": 10, "max_years": 20, "warn_fraction": 0.80},

    # Water heater
    "water_heater":                 {"min_years": 10, "max_years": 15, "warn_fraction": 0.80},
    "tankless_water_heater":        {"min_years": 15, "max_years": 20, "warn_fraction": 0.80},

    # Roofing
    "roof_asphalt_shingle":         {"min_years": 20, "max_years": 25, "warn_fraction": 0.80},
    "roof_architectural_shingle":   {"min_years": 25, "max_years": 30, "warn_fraction": 0.80},
    "roof_metal":                   {"min_years": 40, "max_years": 70, "warn_fraction": 0.80},
    "roof_tile":                    {"min_years": 30, "max_years": 50, "warn_fraction": 0.80},
    "roof_wood_shake":              {"min_years": 20, "max_years": 30, "warn_fraction": 0.80},
    "roof_flat_tpo":                {"min_years": 15, "max_years": 20, "warn_fraction": 0.80},
    "roof_flat_modified_bitumen":   {"min_years": 10, "max_years": 20, "warn_fraction": 0.80},
    "roof_built_up":                {"min_years": 15, "max_years": 20, "warn_fraction": 0.80},

    # Electrical
    "electrical_panel":             {"min_years": 25, "max_years": 40, "warn_fraction": 0.80},

    # Appliances
    "refrigerator":                 {"min_years": 10, "max_years": 15, "warn_fraction": 0.80},
    "dishwasher":                   {"min_years":  7, "max_years": 12, "warn_fraction": 0.80},
    "oven_range":                   {"min_years": 10, "max_years": 15, "warn_fraction": 0.80},
    "microwave":                    {"min_years":  7, "max_years": 10, "warn_fraction": 0.80},
    "washing_machine":              {"min_years":  8, "max_years": 12, "warn_fraction": 0.80},
    "dryer":                        {"min_years": 10, "max_years": 13, "warn_fraction": 0.80},
    "garbage_disposal":             {"min_years":  8, "max_years": 12, "warn_fraction": 0.80},

    # Other mechanical
    "sump_pump":                    {"min_years":  7, "max_years": 10, "warn_fraction": 0.80},
    "garage_door_opener":           {"min_years": 10, "max_years": 15, "warn_fraction": 0.80},
    "pressure_relief_valve":        {"min_years":  3, "max_years":  5, "warn_fraction": 0.80},

    # Safety devices
    "smoke_detector":               {"min_years":  8, "max_years": 10, "warn_fraction": 0.80},
    "carbon_monoxide_detector":     {"min_years":  5, "max_years":  7, "warn_fraction": 0.80},
}


# ---------------------------------------------------------------------------
# Manufacturers associated with known safety or reliability concerns.
# Used to elevate severity or add report warnings when detected in observations.
# Keys match system descriptor field prefixes.
# ---------------------------------------------------------------------------
FLAGGED_MANUFACTURERS: dict[str, list[str]] = {
    "electrical_panel": [
        "Federal Pacific",   # Stab-Lok breakers — documented fire risk
        "Zinsco",            # Breakers may not trip under load
        "Pushmatic",         # Breakers fail to reset; discontinued
        "Sylvania",          # Later Zinsco variant
        "Challenger",        # Similar documented failure modes
    ],
    "plumbing_pipe": [
        "Kitec",             # Recalled — dezincification causes leaks
        "Polybutylene",      # Recalled — degrades with chlorinated water
    ],
}


# ---------------------------------------------------------------------------
# System descriptor fields that must be filled before generating a report.
# Keys match top-level keys in system_descriptors.SYSTEM_DESCRIPTORS.
# Values are lists of field keys within that system.
#
# To make a field optional for the report: remove it from this list.
# To require a new field: add it here (and define it in system_descriptors.py).
# ---------------------------------------------------------------------------
REQUIRED_FOR_REPORT: dict[str, list[str]] = {
    "roof":         ["material"],
    "hvac":         ["system_type", "fuel_type"],
    "water_heater": ["fuel_type"],
    "electrical":   ["panel_amperage"],
    "foundation":   ["type"],
    "plumbing":     ["supply_material"],
}
