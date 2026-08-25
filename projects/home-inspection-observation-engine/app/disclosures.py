from typing import Optional


def _m(value: Optional[str], *targets: str) -> bool:
    """Case-insensitive match against any of the target strings."""
    if not value:
        return False
    v = value.lower().strip()
    return any(v == t.lower() for t in targets)


# ---------------------------------------------------------------------------
# Universal disclaimers — included in every report regardless of property type
# ---------------------------------------------------------------------------

UNIVERSAL_DISCLAIMERS = [
    {
        "title": "Scope and Purpose",
        "body": (
            "This inspection report reflects the observable conditions of the property at the time of inspection only. "
            "Conditions may change after the inspection date due to weather, use, occupancy, or other factors. "
            "This report is not a prediction of future conditions."
        ),
    },
    {
        "title": "Not a Warranty or Guarantee",
        "body": (
            "This inspection and report are not a warranty, guarantee, or insurance policy of any kind. "
            "The inspector does not assume liability for the cost of repair or replacement of reported deficiencies "
            "or for any deficiencies that were not observable at the time of inspection."
        ),
    },
    {
        "title": "Not Technically Exhaustive",
        "body": (
            "This inspection is a visual survey of accessible components and systems. It is not technically exhaustive "
            "and does not include engineering analysis, laboratory testing, or the use of specialized instruments "
            "beyond standard inspection tools."
        ),
    },
    {
        "title": "Concealed and Latent Defects",
        "body": (
            "This inspection does not cover concealed, latent, or inaccessible conditions. Components behind walls, "
            "under flooring, above finished ceilings, or otherwise not accessible for visual inspection are excluded "
            "from this report."
        ),
    },
    {
        "title": "Code Compliance",
        "body": (
            "This inspection does not determine compliance with local, state, or federal building codes, ordinances, "
            "zoning regulations, or manufacturer installation instructions. Code compliance determinations require "
            "a licensed code official."
        ),
    },
    {
        "title": "Remaining Useful Life",
        "body": (
            "Estimates of component age and end-of-life projections included in this report are approximations based "
            "on typical industry lifespans and observed conditions. The inspector does not guarantee the remaining "
            "useful life of any component or system."
        ),
    },
    {
        "title": "Cost Estimates",
        "body": (
            "Cost estimates provided in this report are general magnitude approximations only and are not bids, quotes, "
            "or contractor estimates. Actual repair or replacement costs may vary significantly based on contractor, "
            "materials, location, and scope. Obtain qualified contractor quotes for accurate pricing."
        ),
    },
    {
        "title": "Accessible and Observable Conditions Only",
        "body": (
            "The scope of this inspection is limited to conditions that were accessible and observable at the time of "
            "inspection. Components that were not operated, not accessible, or not present are noted in the "
            "Not Inspected section of this report."
        ),
    },
    {
        "title": "Environmental Hazards Excluded",
        "body": (
            "This inspection does not include testing for or assessment of mold, mildew, asbestos, lead paint, "
            "radon, carbon monoxide, wood-destroying organisms, underground storage tanks, soil contamination, "
            "or other environmental hazards. Separate specialist testing is recommended where applicable."
        ),
    },
    {
        "title": "Property Scope",
        "body": (
            "This inspection applies to residential properties containing four or fewer dwelling units. "
            "Detached structures, outbuildings, or systems not specified in the inspection agreement may be "
            "excluded from this report."
        ),
    },
]


# ---------------------------------------------------------------------------
# Conditional disclaimers — included only when triggered by property data
# ---------------------------------------------------------------------------

def _has_crawl_space(insp) -> bool:
    return _m(insp.foundation_type, "Crawl Space")

def _has_pier_and_beam(insp) -> bool:
    return _m(insp.foundation_type, "Pier & Beam")

def _has_aluminum_wiring(insp) -> bool:
    return _m(insp.electrical_wiring_type, "Aluminum (pre-1972)")

def _has_knob_and_tube(insp) -> bool:
    return _m(insp.electrical_wiring_type, "Knob & Tube")

def _has_multiple_roof_layers(insp) -> bool:
    return _m(insp.roof_layers, "3+")

def _has_propane(insp) -> bool:
    return _m(insp.water_heater_fuel_type, "Propane", "Tankless - Gas") or \
           _m(insp.hvac_fuel_type, "Propane")

def _has_galvanized_supply(insp) -> bool:
    return _m(insp.plumbing_supply_material, "Galvanized Steel")

def _has_polybutylene(insp) -> bool:
    return _m(insp.plumbing_supply_material, "Polybutylene")


CONDITIONAL_DISCLAIMERS = [
    (
        _has_crawl_space,
        {
            "title": "Crawl Space Limitations",
            "body": (
                "This property contains a crawl space. Visibility and accessibility within crawl spaces is often "
                "limited by clearance, insulation, vapor barriers, mechanical equipment, and standing water. "
                "Conditions observed are limited to accessible portions. A specialist inspection of the crawl space "
                "is recommended if concerns about moisture, pests, or structural conditions are noted."
            ),
        },
    ),
    (
        _has_pier_and_beam,
        {
            "title": "Pier and Beam Foundation Limitations",
            "body": (
                "This property is constructed on a pier and beam foundation. Underfloor areas may have limited "
                "accessibility due to clearance, insulation, or stored materials. Conditions observed are limited "
                "to accessible portions. Settlement, wood deterioration, and moisture intrusion are common concerns "
                "with this foundation type and may not be fully visible during a standard inspection."
            ),
        },
    ),
    (
        _has_aluminum_wiring,
        {
            "title": "Aluminum Wiring (Pre-1972)",
            "body": (
                "Pre-1972 aluminum branch circuit wiring was observed at this property. Aluminum wiring of this era "
                "is associated with an elevated risk of overheating at connection points due to oxidation and "
                "differing expansion rates between aluminum and devices designed for copper. Evaluation and "
                "remediation by a licensed electrician familiar with aluminum wiring is strongly recommended."
            ),
        },
    ),
    (
        _has_knob_and_tube,
        {
            "title": "Knob and Tube Wiring",
            "body": (
                "Knob and tube wiring was observed at this property. This wiring type is ungrounded, has no "
                "equipment grounding conductor, and is not compatible with modern three-prong devices. It is "
                "also incompatible with most insulation materials and may have been subject to amateur modifications "
                "over its lifespan. Evaluation by a licensed electrician and review by the homeowner's insurance "
                "carrier are recommended."
            ),
        },
    ),
    (
        _has_multiple_roof_layers,
        {
            "title": "Multiple Roof Layers",
            "body": (
                "Three or more layers of roofing material were observed. Multiple layers limit the inspector's "
                "ability to assess the condition of underlying sheathing, flashing, and structural decking. "
                "Underlying conditions including rot, moisture damage, and structural deterioration may not be "
                "visible. Most roofing manufacturers void warranties when installed over existing layers."
            ),
        },
    ),
    (
        _has_propane,
        {
            "title": "LP / Propane Gas Systems",
            "body": (
                "Liquid propane (LP) gas systems were observed at this property. LP gas is heavier than air and "
                "will accumulate at low points in the event of a leak, increasing ignition risk. Tank ownership, "
                "lease terms, and the location of the main shutoff should be confirmed with the current owner. "
                "Annual servicing of LP appliances and regulators is recommended."
            ),
        },
    ),
    (
        _has_galvanized_supply,
        {
            "title": "Galvanized Steel Supply Piping",
            "body": (
                "Galvanized steel supply piping was observed at this property. Galvanized pipe corrodes internally "
                "over time, progressively restricting flow and water pressure. Interior corrosion is not visible "
                "during a standard inspection. Galvanized piping in older homes is typically near or past its "
                "useful service life and replacement should be anticipated."
            ),
        },
    ),
    (
        _has_polybutylene,
        {
            "title": "Polybutylene Supply Piping",
            "body": (
                "Polybutylene supply piping was observed at this property. Polybutylene was the subject of a class "
                "action settlement due to a high rate of failure, particularly at fittings. This material is no "
                "longer manufactured for plumbing use. Replacement by a licensed plumber is strongly recommended "
                "and may be required by some insurance carriers."
            ),
        },
    ),
]


def get_applicable_disclaimers(inspection) -> list[dict]:
    """
    Returns universal disclaimers plus any conditional ones triggered
    by the inspection's system profile fields. Call at PDF generation time.
    """
    result = list(UNIVERSAL_DISCLAIMERS)
    for trigger_fn, disclaimer in CONDITIONAL_DISCLAIMERS:
        if trigger_fn(inspection):
            result.append(disclaimer)
    return result
