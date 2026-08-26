"""
Demo seeder — wipes and recreates a full demo inspection with pre-structured
approved observations so you can iterate on the report design without re-running
the LLM. Drop your real photos into demo_photos/ and re-run any time.

Usage (from project root, with venv active):
    python seed_demo.py                      # uses first inspector in DB
    python seed_demo.py you@example.com      # targets specific inspector account

Photo naming convention in demo_photos/:
    roof_*          → Roofing observations
    electrical_*    → Electrical observations
    hvac_*          → HVAC observations
    plumbing_*      → Plumbing observations
    exterior_*      → Exterior observations
    interior_*      → Interior observations
    structure_*     → Structure observations
    garage_*        → Garage observations
    site_*          → Site and Grounds observations
    appliance_*     → Appliance observations
    insulation_*    → Insulation and Ventilation observations
    front_of_house* → Cover page hero photo
    (anything else) → assigned to any remaining observations
"""

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.schemas import (
    Inspector, Inspection, StructuredObservation, Photo,
    ObservationStatus, Severity, SubCategory, HomeSystem,
    ResponsibleProfessional, EstimatedCostRange, SourceInputType, EolSource,
)
from app.auth import hash_password

# ---------------------------------------------------------------------------
# Demo inspection metadata
# ---------------------------------------------------------------------------

DEMO_ADDRESS = "142 Maple Ridge Drive, Charlotte, NC 28202"
DEMO_CLIENT  = "Robert and Susan Mitchell"
DEMO_DATE    = datetime(2026, 8, 24, 9, 0, 0, tzinfo=timezone.utc)

DEMO_WEATHER = {
    "daily": [
        {"date": "2026-08-20", "weather_code": 1,  "temp_max_f": 88, "temp_min_f": 68, "precipitation_in": 0.00},
        {"date": "2026-08-21", "weather_code": 3,  "temp_max_f": 84, "temp_min_f": 66, "precipitation_in": 0.10},
        {"date": "2026-08-22", "weather_code": 51, "temp_max_f": 76, "temp_min_f": 62, "precipitation_in": 0.52},
        {"date": "2026-08-23", "weather_code": 1,  "temp_max_f": 82, "temp_min_f": 65, "precipitation_in": 0.00},
        {"date": "2026-08-24", "weather_code": 1,  "temp_max_f": 85, "temp_min_f": 67, "precipitation_in": 0.00},
    ],
    "temp_at_inspection_f": 74,
}

DEMO_PROFILE = {
    "roof_material":                  "Asphalt Shingle",
    "roof_estimated_age_years":       22.0,
    "roof_layers":                    "1",
    "hvac_system_type":               "Forced Air",
    "hvac_fuel_type":                 "Natural Gas",
    "hvac_estimated_age_years":       20.0,
    "hvac_filter_condition":          "Dirty",
    "water_heater_fuel_type":         "Natural Gas",
    "water_heater_estimated_age_years": 17.0,
    "water_heater_capacity_gallons":  50.0,
    "electrical_panel_amperage":      "200A",
    "electrical_panel_manufacturer":  "Square D",
    "electrical_wiring_type":         "Copper",
    "electrical_gfci_present":        True,
    "foundation_type":                "Crawl Space",
    "foundation_material":            "Concrete Block",
    "plumbing_supply_material":       "Copper",
    "plumbing_drain_material":        "PVC",
    "plumbing_water_pressure_psi":    70.0,
    "exterior_siding_material":       "Vinyl",
    "exterior_driveway_material":     "Concrete",
}

# ---------------------------------------------------------------------------
# Pre-structured observations (no LLM required)
# system_tag is used to match photos from demo_photos/
# ---------------------------------------------------------------------------

OBSERVATIONS = [
    # --- Roofing ---
    dict(
        system_tag="roof",
        title="Missing Shingles on Rear Roof Slope",
        system=HomeSystem.ROOFING, room_or_area="Rear roof slope", component="Asphalt shingles",
        defect_type="Missing shingles",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.REPAIR_REPLACE,
        safety_related=False,
        professional_report_description=(
            "Several asphalt shingles were observed missing on the rear roof slope, visible from ground level. "
            "Missing shingles expose the underlying felt paper and decking to the elements. Water infiltration in "
            "these areas can lead to roof deck deterioration, sheathing damage, and interior water damage."
        ),
        plain_english_summary="Several shingles are missing from the back of your roof. Rain can get in through those gaps and damage the roof structure and interior.",
        recommended_action="A licensed roofing contractor should replace the missing shingles and inspect the surrounding area for underlying damage.",
        responsible_professional=ResponsibleProfessional.ROOFER,
        estimated_cost_range=EstimatedCostRange.THREE_HUNDRED_TO_750,
        source_input_type=SourceInputType.TEXT, confidence=0.94,
    ),
    dict(
        system_tag="roof",
        title="Roof Approaching End of Service Life",
        system=HomeSystem.ROOFING, room_or_area="Full roof", component="Asphalt shingle roof",
        defect_type="Age and wear — approaching end of service life",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.END_OF_LIFE,
        safety_related=False,
        professional_report_description=(
            "The asphalt shingle roof appears original to the home, estimated at approximately 22 years of age based "
            "on observed wear. Standard 3-tab shingles have an expected service life of 20–25 years. Visible granule "
            "loss, weathering, and flashing condition suggest this roof is nearing the end of its functional life."
        ),
        plain_english_summary="The roof looks original — about 22 years old. Asphalt shingle roofs typically last 20–25 years. Plan for replacement in the next few years.",
        recommended_action="Obtain quotes from licensed roofing contractors for full roof replacement.",
        responsible_professional=ResponsibleProfessional.ROOFER,
        estimated_cost_range=EstimatedCostRange.OVER_2500,
        source_input_type=SourceInputType.TEXT, confidence=0.88,
        approaching_end_of_life=True, eol_source=EolSource.INFERRED,
        eol_reasoning="Roof estimated 22 years old based on appearance and wear. Standard asphalt shingles have 20–25 year lifespan.",
    ),
    # --- Exterior ---
    dict(
        system_tag="exterior",
        title="Damaged Exterior Wall Boards at Rear Elevation",
        system=HomeSystem.EXTERIOR, room_or_area="Rear exterior", component="Exterior wall sheathing and trim",
        defect_type="Wood deterioration / physical damage",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.REPAIR_REPLACE,
        safety_related=False,
        professional_report_description=(
            "Multiple deteriorated and damaged boards were observed on the rear exterior wall near the window. "
            "Damage includes surface checks, splitting, and possible moisture infiltration behind the siding. "
            "Left unaddressed, moisture intrusion can lead to sheathing damage and interior water infiltration."
        ),
        plain_english_summary="Some boards on the back of the house near a window are rotting and damaged. If left alone, water can get inside the walls.",
        recommended_action="A qualified contractor should replace damaged boards, ensure proper window flashing, and paint all exposed wood.",
        responsible_professional=ResponsibleProfessional.GENERAL_CONTRACTOR,
        estimated_cost_range=EstimatedCostRange.THREE_HUNDRED_TO_750,
        source_input_type=SourceInputType.TEXT, confidence=0.92,
    ),
    # --- Structure ---
    dict(
        system_tag="structure",
        title="Horizontal Crack in Poured Concrete Foundation Wall",
        system=HomeSystem.STRUCTURE, room_or_area="Basement — north wall", component="Poured concrete foundation wall",
        defect_type="Horizontal foundation crack — structural concern",
        severity=Severity.SAFETY_HAZARD, sub_category=SubCategory.IMMEDIATE_SAFETY,
        safety_related=True,
        professional_report_description=(
            "A horizontal crack approximately 8 feet in length was observed along the midpoint of the poured concrete "
            "foundation wall on the north elevation. Horizontal cracks indicate lateral soil pressure overcoming the "
            "wall's structural capacity. This condition can worsen over time and may pose a risk of wall failure."
        ),
        plain_english_summary="There is a long horizontal crack in your foundation wall. This is a serious structural concern — the soil outside is pushing in on the wall. A structural engineer must evaluate this before closing.",
        recommended_action="Evaluation by a licensed structural engineer is required immediately. Repair may include wall anchors, carbon fiber straps, or other structural interventions.",
        responsible_professional=ResponsibleProfessional.STRUCTURAL_ENGINEER,
        estimated_cost_range=EstimatedCostRange.OVER_2500,
        source_input_type=SourceInputType.TEXT, confidence=0.97,
    ),
    dict(
        system_tag="structure",
        title="Efflorescence on Foundation Wall in Basement",
        system=HomeSystem.STRUCTURE, room_or_area="Basement", component="Concrete block foundation wall",
        defect_type="Efflorescence / moisture intrusion evidence",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.EVALUATE,
        safety_related=False,
        professional_report_description=(
            "White efflorescence deposits were observed along the lower course of the foundation wall in the northwest "
            "basement corner. Efflorescence results from water moving through concrete and depositing dissolved salts "
            "on the surface. Its presence indicates ongoing moisture movement through the foundation."
        ),
        plain_english_summary="There are white chalky stains on the basement foundation wall. This is caused by water moving through the concrete — moisture is getting in.",
        recommended_action="Further evaluation by a foundation specialist is recommended to determine the moisture source and appropriate waterproofing measures.",
        responsible_professional=ResponsibleProfessional.FOUNDATION_CONTRACTOR,
        estimated_cost_range=EstimatedCostRange.ZERO_TO_100,
        source_input_type=SourceInputType.TEXT, confidence=0.88,
    ),
    dict(
        system_tag="structure",
        title="Suspected Termite Activity — Mud Tubes in Crawl Space",
        system=HomeSystem.STRUCTURE, room_or_area="Crawl space", component="Foundation wall",
        defect_type="Suspected subterranean termite activity",
        severity=Severity.SAFETY_HAZARD, sub_category=SubCategory.IMMEDIATE_SAFETY,
        safety_related=False,
        professional_report_description=(
            "Mud tubes consistent with subterranean termite activity were observed on the foundation wall inside the "
            "crawl space. Subterranean termites use mud tubes as protected pathways between soil and above-grade wood. "
            "Structural wood members in the crawl space and floor system may be at risk. This is outside standard "
            "home inspection scope and warrants a dedicated pest inspection."
        ),
        plain_english_summary="We found mud tubes in the crawl space that are consistent with termite tunnels. Termites can silently damage your home's structure. Get a pest inspection before closing.",
        recommended_action="A licensed pest control inspector should evaluate for active infestation and assess the extent of any damage. Treatment and a wood damage report may be required.",
        responsible_professional=ResponsibleProfessional.PEST_CONTROL,
        estimated_cost_range=EstimatedCostRange.SEVEN_FIFTY_TO_2500,
        source_input_type=SourceInputType.TEXT, confidence=0.93,
    ),
    # --- Electrical ---
    dict(
        system_tag="electrical",
        title="Double-Tapped Circuit Breaker in Main Electrical Panel",
        system=HomeSystem.ELECTRICAL, room_or_area="Main electrical panel", component="Circuit breaker",
        defect_type="Double-tapped breaker — improper wiring",
        severity=Severity.SAFETY_HAZARD, sub_category=SubCategory.IMMEDIATE_SAFETY,
        safety_related=True,
        professional_report_description=(
            "A double-tapped breaker was observed in the main electrical panel — two circuit conductors connected to "
            "a single breaker terminal. Most breakers are rated for only one conductor. Double-tapping can cause loose "
            "connections, arcing, overheating, and fire. This condition is not compliant with NEC standards."
        ),
        plain_english_summary="Two wires are connected to one breaker in the electrical panel — it should only hold one. This can cause overheating and is a fire hazard.",
        recommended_action="A licensed electrician should correct the double-tap by installing a tandem breaker or a separate dedicated circuit. Do not defer this repair.",
        responsible_professional=ResponsibleProfessional.ELECTRICIAN,
        estimated_cost_range=EstimatedCostRange.THREE_HUNDRED_TO_750,
        source_input_type=SourceInputType.TEXT, confidence=0.99,
    ),
    dict(
        system_tag="electrical",
        title="Missing Outlet Cover Plate — Exposed Wiring in Garage",
        system=HomeSystem.ELECTRICAL, room_or_area="Garage", component="Electrical outlet",
        defect_type="Missing cover plate / exposed wiring",
        severity=Severity.SAFETY_HAZARD, sub_category=SubCategory.SAFETY_UPGRADE,
        safety_related=True,
        professional_report_description=(
            "An electrical outlet in the garage was missing its cover plate, leaving energized conductors and the "
            "receptacle interior directly accessible. Contact with exposed wiring presents a risk of electrical shock "
            "or electrocution, particularly in a garage environment where the outlet may be contacted by tools or wet hands."
        ),
        plain_english_summary="An outlet in the garage has no cover plate — the wiring inside is exposed. This is a shock hazard, especially in a garage.",
        recommended_action="Install an appropriate weatherproof or standard cover plate immediately. This is a simple DIY fix.",
        responsible_professional=ResponsibleProfessional.HOMEOWNER_DIY,
        estimated_cost_range=EstimatedCostRange.ZERO_TO_100,
        source_input_type=SourceInputType.AUDIO, confidence=0.98,
    ),
    # --- Plumbing ---
    dict(
        system_tag="plumbing",
        title="Active Leak at Kitchen Sink P-Trap",
        system=HomeSystem.PLUMBING, room_or_area="Kitchen", component="Kitchen sink P-trap",
        defect_type="Active water leak",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.REPAIR_REPLACE,
        safety_related=False,
        professional_report_description=(
            "An active water leak was observed at the P-trap beneath the kitchen sink. The cabinet base was wet and "
            "dripping water was visible at the trap fitting. Prolonged leakage can lead to wood rot, mold growth, "
            "and structural deterioration of the cabinet base."
        ),
        plain_english_summary="The pipe under the kitchen sink is actively leaking. The bottom of the cabinet is already wet. Fix this soon to avoid mold and wood damage.",
        recommended_action="Have a licensed plumber repair or replace the P-trap assembly. Dry out and inspect the cabinet interior for mold.",
        responsible_professional=ResponsibleProfessional.PLUMBER,
        estimated_cost_range=EstimatedCostRange.ONE_HUNDRED_TO_300,
        source_input_type=SourceInputType.TEXT, confidence=0.95,
    ),
    dict(
        system_tag="plumbing",
        title="Water Heater Approaching End of Service Life",
        system=HomeSystem.PLUMBING, room_or_area="Utility room", component="Tank water heater",
        defect_type="Age — approaching end of service life",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.END_OF_LIFE,
        safety_related=False,
        professional_report_description=(
            "The water heater was observed to be approximately 17 years old. The typical service life for a residential "
            "tank water heater is 10–15 years. At 17 years, the unit is operating beyond its expected service life and "
            "is at elevated risk of failure, including tank rupture and associated water damage."
        ),
        plain_english_summary="The water heater is 17 years old — most last 10–15 years. It could fail at any time and cause flooding. Budget for replacement soon.",
        recommended_action="Plan for replacement in the near term. Consider upgrading to a high-efficiency or tankless model.",
        responsible_professional=ResponsibleProfessional.PLUMBER,
        estimated_cost_range=EstimatedCostRange.SEVEN_FIFTY_TO_2500,
        source_input_type=SourceInputType.TEXT, confidence=0.90,
        approaching_end_of_life=True, eol_source=EolSource.INFERRED,
        eol_reasoning="Unit approximately 17 years old. Typical service life is 10–15 years. Unit exceeds expected lifespan.",
    ),
    # --- HVAC ---
    dict(
        system_tag="hvac",
        title="HVAC System at End of Service Life",
        system=HomeSystem.HVAC, room_or_area="Utility room / exterior", component="Furnace and air conditioner",
        defect_type="Age — at end of service life",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.END_OF_LIFE,
        safety_related=False,
        professional_report_description=(
            "The HVAC system (furnace and AC) was observed to be approximately 20 years old. The expected service life "
            "of a residential furnace is 15–20 years; central AC units typically last 12–15 years. Both components are "
            "at or beyond expected service life. Efficiency has likely declined significantly and failure probability is elevated."
        ),
        plain_english_summary="The furnace and AC are both around 20 years old — at the end of their expected life. They could fail soon. Budget for replacement, prioritizing the AC.",
        recommended_action="Have an HVAC technician perform a full system evaluation and provide a replacement quote. Prioritize the AC unit given its shorter typical lifespan.",
        responsible_professional=ResponsibleProfessional.HVAC_TECHNICIAN,
        estimated_cost_range=EstimatedCostRange.OVER_2500,
        source_input_type=SourceInputType.TEXT, confidence=0.92,
        approaching_end_of_life=True, eol_source=EolSource.INFERRED,
        eol_reasoning="HVAC system labeled 2006, approximately 20 years old. Exceeds typical service life of 15–20 years for furnace and 12–15 years for AC.",
    ),
    dict(
        system_tag="hvac",
        title="Clogged HVAC Condensate Drain Line",
        system=HomeSystem.HVAC, room_or_area="Air handler / utility room", component="Condensate drain",
        defect_type="Clogged condensate drain / standing water in drip pan",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.REPAIR_REPLACE,
        safety_related=False,
        professional_report_description=(
            "The condensate drain line on the air handler was clogged and water was actively pooling in the drip pan. "
            "If the drip pan overflows, significant water damage to surrounding structure, insulation, and finished "
            "spaces below can result. This indicates the system has not been serviced on a regular schedule."
        ),
        plain_english_summary="The drain line on the AC/air handler is clogged. Water is sitting in the overflow pan. If it backs up further, it can overflow and cause water damage.",
        recommended_action="Have an HVAC technician flush and clear the condensate drain line and inspect the drip pan for corrosion.",
        responsible_professional=ResponsibleProfessional.HVAC_TECHNICIAN,
        estimated_cost_range=EstimatedCostRange.ONE_HUNDRED_TO_300,
        source_input_type=SourceInputType.TEXT, confidence=0.96,
    ),
    # --- Interior ---
    dict(
        system_tag="interior",
        title="Water Staining on Living Room Ceiling",
        system=HomeSystem.INTERIOR, room_or_area="Living room", component="Ceiling",
        defect_type="Water staining — possible prior or active leak",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.EVALUATE,
        safety_related=False,
        professional_report_description=(
            "A large water stain was observed on the living room ceiling, located directly below the second-floor bathroom. "
            "The stain appeared dry at time of inspection, suggesting the leak may be intermittent or previously repaired. "
            "The source must be identified and confirmed resolved before closing."
        ),
        plain_english_summary="There's a big water stain on the living room ceiling under the upstairs bathroom. It was dry when we looked, but find out where the water came from.",
        recommended_action="Have a plumber evaluate the plumbing above and a contractor assess the ceiling for hidden damage.",
        responsible_professional=ResponsibleProfessional.FURTHER_EVALUATION,
        estimated_cost_range=EstimatedCostRange.ZERO_TO_100,
        source_input_type=SourceInputType.TEXT, confidence=0.90,
    ),
    dict(
        system_tag="interior",
        title="Mold Growth on Basement Walls and Floor Joists",
        system=HomeSystem.INTERIOR, room_or_area="Basement", component="Walls and floor joists",
        defect_type="Visible mold growth",
        severity=Severity.SAFETY_HAZARD, sub_category=SubCategory.IMMEDIATE_SAFETY,
        safety_related=True,
        professional_report_description=(
            "Visible mold growth was observed on multiple basement walls and on the underside of floor joists. "
            "A musty odor was present throughout the basement. Mold indicates an ongoing or unresolved moisture problem. "
            "Certain mold species pose health risks, particularly for individuals with respiratory conditions or allergies."
        ),
        plain_english_summary="There is visible mold on the basement walls and under the floors above. Mold is a health hazard and means there's a moisture problem that hasn't been fixed.",
        recommended_action="A mold remediation professional should evaluate and remediate per IICRC S520 standards. The underlying moisture source must also be identified and corrected.",
        responsible_professional=ResponsibleProfessional.MOLD_WATER_MITIGATION,
        estimated_cost_range=EstimatedCostRange.OVER_2500,
        source_input_type=SourceInputType.TEXT, confidence=0.96,
    ),
    # --- Insulation and Ventilation ---
    dict(
        system_tag="insulation",
        title="Uninsulated Attic Stair Hatch — Thermal Bypass",
        system=HomeSystem.INSULATION_AND_VENTILATION, room_or_area="Hallway ceiling / attic access",
        component="Attic stair hatch cover", defect_type="Missing insulation at attic access",
        severity=Severity.ADVISORY, sub_category=SubCategory.MAINTENANCE,
        safety_related=False,
        professional_report_description=(
            "The pull-down attic stair hatch cover had no insulation on its upper surface, creating an uninsulated "
            "opening in the home's thermal envelope. The attic access point is a common area of heat loss in winter "
            "and heat gain in summer. An insulated cover or tent can significantly reduce energy loss."
        ),
        plain_english_summary="The pull-down attic stairs have no insulation on the cover. Heat escapes through this gap in winter. It's an easy, cheap fix.",
        recommended_action="Install a prefabricated insulated attic stair cover or build an insulated box tent. This is a DIY-friendly project.",
        responsible_professional=ResponsibleProfessional.HOMEOWNER_DIY,
        estimated_cost_range=EstimatedCostRange.ONE_HUNDRED_TO_300,
        source_input_type=SourceInputType.TEXT, confidence=0.95,
    ),
    # --- Appliances ---
    dict(
        system_tag="appliance",
        title="Standing Water in Dishwasher After Complete Cycle",
        system=HomeSystem.APPLIANCES, room_or_area="Kitchen", component="Dishwasher",
        defect_type="Drain malfunction — standing water",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.EVALUATE,
        safety_related=False,
        professional_report_description=(
            "The dishwasher completed a full wash cycle; however, standing water remained in the bottom of the unit "
            "after the cycle concluded. This indicates a drain malfunction, which may be caused by a clogged filter, "
            "failed drain pump, kinked drain hose, or improperly installed air gap."
        ),
        plain_english_summary="After running a full cycle, water was still sitting in the bottom of the dishwasher. Something is preventing it from draining properly.",
        recommended_action="Have an appliance technician diagnose and repair the drain issue. Check the filter, drain hose, and air gap first.",
        responsible_professional=ResponsibleProfessional.APPLIANCE_TECHNICIAN,
        estimated_cost_range=EstimatedCostRange.ONE_HUNDRED_TO_300,
        source_input_type=SourceInputType.TEXT, confidence=0.91,
    ),
    # --- Garage ---
    dict(
        system_tag="garage",
        title="Garage Door Auto-Reverse Safety Feature Not Functioning",
        system=HomeSystem.GARAGE, room_or_area="Garage", component="Garage door opener",
        defect_type="Auto-reverse safety mechanism failure",
        severity=Severity.SAFETY_HAZARD, sub_category=SubCategory.SAFETY_UPGRADE,
        safety_related=True,
        professional_report_description=(
            "The garage door opener was tested and did not auto-reverse when an obstruction was placed in the door's "
            "travel path. Auto-reversal is a required safety feature per UL 325, designed to prevent injury or "
            "entrapment. A non-reversing garage door poses a significant crush hazard to children and pets."
        ),
        plain_english_summary="The garage door opener doesn't stop and reverse when something is in the way. This is a serious safety hazard — it could injure a child or pet.",
        recommended_action="Have a garage door technician inspect and repair or replace the auto-reverse mechanism. Test by placing a 2x4 flat on the ground under the door.",
        responsible_professional=ResponsibleProfessional.QUALIFIED_SPECIALIST,
        estimated_cost_range=EstimatedCostRange.ONE_HUNDRED_TO_300,
        source_input_type=SourceInputType.AUDIO, confidence=0.97,
    ),
    # --- Site and Grounds ---
    dict(
        system_tag="site",
        title="Negative Site Grading Directs Water Toward Foundation",
        system=HomeSystem.SITE_AND_GROUNDS, room_or_area="Rear yard", component="Site grading",
        defect_type="Negative grading — improper drainage",
        severity=Severity.DEFICIENCY, sub_category=SubCategory.REPAIR_REPLACE,
        safety_related=False,
        professional_report_description=(
            "Soil grading at the rear of the property slopes toward the foundation rather than away from it. Proper "
            "grading should slope away at a minimum of 6 inches over the first 10 feet per IRC guidelines. Negative "
            "grading directs surface runoff toward the foundation, increasing risk of water intrusion."
        ),
        plain_english_summary="The ground at the back of the house slopes toward the foundation. When it rains, water flows toward the house and can get into the crawl space.",
        recommended_action="Re-grade the soil at the rear of the property to achieve positive drainage away from the foundation.",
        responsible_professional=ResponsibleProfessional.GENERAL_CONTRACTOR,
        estimated_cost_range=EstimatedCostRange.SEVEN_FIFTY_TO_2500,
        source_input_type=SourceInputType.TEXT, confidence=0.93,
    ),
]

# ---------------------------------------------------------------------------
# Photo matching
# ---------------------------------------------------------------------------

SYSTEM_TAG_TO_KEYWORD = {
    "roof":       ["roof"],
    "electrical": ["electrical", "panel", "outlet", "breaker"],
    "hvac":       ["hvac", "furnace", "ac", "condensate", "air_handler"],
    "plumbing":   ["plumbing", "plumb", "sink", "water_heater", "pipe"],
    "exterior":   ["exterior", "siding", "trim"],
    "interior":   ["interior", "ceiling", "basement", "living", "kitchen", "mold"],
    "structure":  ["structure", "foundation", "crawl", "crack", "termite"],
    "garage":     ["garage"],
    "site":       ["site", "grading", "yard"],
    "appliance":  ["appliance", "dishwasher"],
    "insulation": ["insulation", "attic"],
}


def load_photo_map(demo_photos_dir: Path) -> dict[str, list[Path]]:
    """Returns {system_tag: [photo_path, ...]} from demo_photos/ filenames."""
    photo_map: dict[str, list[Path]] = {tag: [] for tag in SYSTEM_TAG_TO_KEYWORD}
    photo_map["_unmatched"] = []

    if not demo_photos_dir.exists():
        return photo_map

    extensions = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
    for p in sorted(demo_photos_dir.iterdir()):
        if p.suffix.lower() not in extensions:
            continue
        if p.stem.lower().startswith("front_of_house"):
            continue  # handled separately
        matched = False
        for tag, keywords in SYSTEM_TAG_TO_KEYWORD.items():
            if any(kw in p.stem.lower() for kw in keywords):
                photo_map[tag].append(p)
                matched = True
                break
        if not matched:
            photo_map["_unmatched"].append(p)

    return photo_map


def pick_photo(tag: str, photo_map: dict, used: set) -> Path | None:
    candidates = [p for p in photo_map.get(tag, []) if p not in used]
    if not candidates:
        candidates = [p for p in photo_map.get("_unmatched", []) if p not in used]
    if candidates:
        used.add(candidates[0])
        return candidates[0]
    return None


# ---------------------------------------------------------------------------
# Main seeder
# ---------------------------------------------------------------------------

def main():
    target_email = sys.argv[1] if len(sys.argv) > 1 else None
    demo_photos_dir = Path(__file__).resolve().parent / "demo_photos"

    create_db_and_tables()

    # Run Audio table migration if needed
    from sqlalchemy import text
    from app.database import engine as _engine
    with _engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE audio ADD COLUMN transcript TEXT"))
            conn.commit()
        except Exception:
            pass

    with Session(engine) as session:
        # --- Find or create demo inspector ---
        if target_email:
            inspector = session.exec(select(Inspector).where(Inspector.email == target_email)).first()
            if not inspector:
                print(f"No inspector found with email {target_email}. Creating one.")
                inspector = Inspector(
                    email=target_email,
                    hashed_password=hash_password("demo1234"),
                    name="Demo Inspector",
                    company_name="Benchmark Home Inspections",
                    license_number="HI-2024-DEMO",
                    company_phone="(704) 555-0100",
                    standards_complied_with="InterNACHI Standards of Practice",
                    created_at=datetime.now(timezone.utc),
                )
                session.add(inspector)
                session.commit()
                session.refresh(inspector)
        else:
            inspector = session.exec(select(Inspector)).first()
            if not inspector:
                print("No inspector found. Creating a demo account (demo@example.com / demo1234).")
                inspector = Inspector(
                    email="demo@example.com",
                    hashed_password=hash_password("demo1234"),
                    name="Demo Inspector",
                    company_name="Benchmark Home Inspections",
                    license_number="HI-2024-DEMO",
                    company_phone="(704) 555-0100",
                    standards_complied_with="InterNACHI Standards of Practice",
                    created_at=datetime.now(timezone.utc),
                )
                session.add(inspector)
                session.commit()
                session.refresh(inspector)

        print(f"Using inspector: {inspector.email} (id={inspector.id})")

        # --- Wipe existing demo inspection ---
        existing = session.exec(
            select(Inspection).where(Inspection.address == DEMO_ADDRESS).where(Inspection.inspector_id == inspector.id)
        ).all()
        for old_insp in existing:
            old_obs = session.exec(
                select(StructuredObservation).where(StructuredObservation.inspection_id == old_insp.id)
            ).all()
            for obs in old_obs:
                for pid in (obs.photo_ids or []):
                    p = session.get(Photo, pid)
                    if p:
                        session.delete(p)
                session.delete(obs)
            session.delete(old_insp)
        session.commit()
        print(f"Cleared {len(existing)} existing demo inspection(s).")

        # --- Front of house photo ---
        foh_data, foh_ct = None, None
        foh_candidates = list(demo_photos_dir.glob("front_of_house*")) if demo_photos_dir.exists() else []
        if foh_candidates:
            foh_path = foh_candidates[0]
            foh_data = foh_path.read_bytes()
            ext = foh_path.suffix.lower()
            foh_ct = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext.lstrip('.')}"
            print(f"Front-of-house photo: {foh_path.name}")
        else:
            print("No front_of_house.* found in demo_photos/ — cover will have no hero photo.")

        # --- Create fresh demo inspection ---
        inspection = Inspection(
            inspector_id=inspector.id,
            address=DEMO_ADDRESS,
            client_name=DEMO_CLIENT,
            inspection_date=DEMO_DATE,
            created_at=datetime.now(timezone.utc),
            weather_data=DEMO_WEATHER,
            front_of_house_photo_data=foh_data,
            front_of_house_photo_content_type=foh_ct,
            system_profile_sources={k: "confirmed" for k in DEMO_PROFILE},
            **DEMO_PROFILE,
        )
        session.add(inspection)
        session.commit()
        session.refresh(inspection)
        print(f"Created inspection id={inspection.id}: {DEMO_ADDRESS}")

        # --- Load and match photos ---
        photo_map = load_photo_map(demo_photos_dir)
        used_photos: set[Path] = set()
        total_photos = sum(len(v) for v in photo_map.values())
        print(f"Found {total_photos} photos in demo_photos/")

        # --- Insert observations ---
        for i, obs_data in enumerate(OBSERVATIONS, 1):
            obs_id = str(uuid.uuid4())
            tag = obs_data.pop("system_tag")

            # Attach a photo if one matches
            photo_path = pick_photo(tag, photo_map, used_photos)
            photo_ids = []
            if photo_path:
                ext = photo_path.suffix.lower()
                ct = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext.lstrip('.')}"
                photo_row = Photo(
                    observation_id=obs_id,
                    filename=photo_path.name,
                    content_type=ct,
                    data=photo_path.read_bytes(),
                )
                session.add(photo_row)
                session.flush()
                photo_ids = [photo_row.id]

            eol_kwargs = {}
            for eol_key in ("approaching_end_of_life", "eol_source", "eol_reasoning"):
                if eol_key in obs_data:
                    eol_kwargs[eol_key] = obs_data.pop(eol_key)

            obs = StructuredObservation(
                observation_id=obs_id,
                inspection_id=inspection.id,
                status=ObservationStatus.APPROVED,
                photo_ids=photo_ids,
                needs_human_review=False,
                created_at=DEMO_DATE,
                reviewed_at=DEMO_DATE,
                **obs_data,
                **eol_kwargs,
            )
            session.add(obs)

        session.commit()
        print(f"Inserted {len(OBSERVATIONS)} approved observations.")

        inspector_email = inspector.email
        inspection_id = inspection.id

    port = 8000
    print()
    print("=" * 60)
    print(f"  Demo inspection ready.")
    print(f"  Log in as: {inspector_email}")
    print(f"  Open: http://localhost:5173")
    print(f"  API:  http://localhost:{port}/inspections/{inspection_id}/report.html")
    print("=" * 60)


if __name__ == "__main__":
    main()
