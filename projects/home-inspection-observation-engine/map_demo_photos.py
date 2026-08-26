"""
Map extracted PDF photos to demo_photos/ with system-appropriate names.
Run from project root: python map_demo_photos.py

Sources are in demo_photos_raw/ (extracted by PyMuPDF).
Destination is demo_photos/ (read by seed_demo.py).

Mapping was determined by reading the page-context text alongside each
photo in the extraction output and matching to the 11 system categories.
"""

import shutil
from pathlib import Path

SRC = Path("demo_photos_raw")
DST = Path("demo_photos")
DST.mkdir(exist_ok=True)

# (src_filename, dst_filename)
MAPPING = [
    # ── Front of house ───────────────────────────────────────────────────────
    # pdf1 p001: property address page, first photo = exterior of the home
    ("pdf1_p001_i10.jpeg", "front_of_house_01.jpeg"),

    # ── Roof ─────────────────────────────────────────────────────────────────
    # pdf2 p025: aerial drone overview of roof (composition shingles)
    ("pdf2_p025_i01.jpeg", "roof_01.jpeg"),
    ("pdf2_p025_i02.jpeg", "roof_02.jpeg"),
    ("pdf2_p025_i03.jpeg", "roof_03.jpeg"),
    # pdf2 p026: additional roof overview shots
    ("pdf2_p026_i01.jpeg", "roof_04.jpeg"),
    # pdf2 p028: vent boot inverted (defect finding)
    ("pdf2_p028_i01.jpeg", "roof_05.jpeg"),
    # pdf2 p029: flue vent rusted (defect finding)
    ("pdf2_p029_i01.jpeg", "roof_06.jpeg"),
    # pdf2 p030: headwall flashing improper (defect finding)
    ("pdf2_p030_i01.jpeg", "roof_07.jpeg"),
    # pdf2 p031: gutters full of debris
    ("pdf2_p031_i01.jpeg", "roof_08.jpeg"),

    # ── Exterior ─────────────────────────────────────────────────────────────
    # pdf2 p009: siding overview (fiber cement + hardboard)
    ("pdf2_p009_i01.jpeg", "exterior_01.jpeg"),
    ("pdf2_p009_i02.jpeg", "exterior_02.jpeg"),
    ("pdf2_p009_i05.jpeg", "exterior_03.jpeg"),
    # pdf2 p015: fiber cement siding damaged
    ("pdf2_p015_i01.jpeg", "exterior_04.jpeg"),
    # pdf2 p017: hardboard siding multiple concerns
    ("pdf2_p017_i01.jpeg", "exterior_05.jpeg"),
    # pdf2 p019: window seal failure
    ("pdf2_p019_i01.jpeg", "exterior_06.jpeg"),
    # pdf2 p020: exterior door water damage
    ("pdf2_p020_i01.jpeg", "exterior_07.jpeg"),

    # ── Structure ────────────────────────────────────────────────────────────
    # pdf2 p037: damaged engineered trusses (structural finding)
    ("pdf2_p037_i01.jpeg", "structure_01.jpeg"),
    ("pdf2_p037_i03.jpeg", "structure_02.jpeg"),
    # pdf1 p005-006: guardrail loose/deteriorated + deck beams not secured
    ("pdf1_p005_i01.jpeg", "structure_03.jpeg"),
    ("pdf1_p005_i02.jpeg", "structure_04.jpeg"),
    ("pdf1_p006_i01.jpeg", "structure_05.jpeg"),
    ("pdf1_p006_i02.jpeg", "structure_06.jpeg"),
    # pdf1 p017: minor cracks in foundation
    ("pdf1_p017_i01.jpeg", "structure_07.jpeg"),
    ("pdf1_p017_i02.jpeg", "structure_08.jpeg"),

    # ── Electrical ───────────────────────────────────────────────────────────
    # pdf1 p040: main service panel in basement
    ("pdf1_p040_i04.jpeg", "electrical_01.jpeg"),
    ("pdf1_p040_i05.jpeg", "electrical_02.jpeg"),
    ("pdf1_p040_i06.jpeg", "electrical_03.jpeg"),
    # pdf1 p041: doubled neutral wires on bus bar (defect)
    ("pdf1_p041_i01.jpeg", "electrical_04.jpeg"),
    ("pdf1_p041_i02.jpeg", "electrical_05.jpeg"),
    # pdf1 p042: receptacle issues
    ("pdf1_p042_i01.jpeg", "electrical_06.jpeg"),

    # ── Plumbing ─────────────────────────────────────────────────────────────
    # pdf1 p049: water supply / fuel system overview
    ("pdf1_p049_i03.jpeg", "plumbing_01.jpeg"),
    ("pdf1_p049_i04.jpeg", "plumbing_02.jpeg"),
    # pdf1 p050: pipe through sleeve (abrasion protection finding)
    ("pdf1_p050_i01.jpeg", "plumbing_03.jpeg"),
    # pdf1 p053: gas meter location
    ("pdf1_p053_i03.jpeg", "plumbing_04.jpeg"),
    # pdf1 p055: water heater general photos
    ("pdf1_p055_i03.jpeg", "plumbing_05.jpeg"),
    ("pdf1_p055_i04.jpeg", "plumbing_06.jpeg"),

    # ── HVAC ─────────────────────────────────────────────────────────────────
    # pdf1 p059: HVAC limitation / equipment overview (portrait shots)
    ("pdf1_p059_i01.jpeg", "hvac_01.jpeg"),
    ("pdf1_p059_i02.jpeg", "hvac_02.jpeg"),
    # pdf1 p061: HVAC equipment photos
    ("pdf1_p061_i05.jpeg", "hvac_03.jpeg"),
    ("pdf1_p061_i06.jpeg", "hvac_04.jpeg"),
    # pdf1 p064: condensers age label (Lennox 2008 / 2015)
    ("pdf1_p064_i01.jpeg", "hvac_05.jpeg"),
    # pdf1 p062: rusty supply registers
    ("pdf1_p062_i01.jpeg", "hvac_06.jpeg"),

    # ── Interior ─────────────────────────────────────────────────────────────
    # pdf1 p065: general interior photos
    ("pdf1_p065_i01.jpeg", "interior_01.jpeg"),
    ("pdf1_p065_i02.jpeg", "interior_02.jpeg"),
    ("pdf1_p065_i03.jpeg", "interior_03.jpeg"),
    # pdf1 p090: ceiling stains (no active moisture)
    ("pdf1_p090_i01.jpeg", "interior_04.jpeg"),
    # pdf1 p070: fireplace / kitchen transition area
    ("pdf1_p070_i01.jpeg", "interior_05.jpeg"),
    ("pdf1_p070_i02.jpeg", "interior_06.jpeg"),

    # ── Insulation ───────────────────────────────────────────────────────────
    # pdf2 p032: attic walkable area with insulation context
    ("pdf2_p032_i01.jpeg", "insulation_01.jpeg"),
    ("pdf2_p032_i02.jpeg", "insulation_02.jpeg"),
    # pdf2 p038: insulation deficiencies present
    ("pdf2_p038_i01.jpeg", "insulation_03.jpeg"),
    # pdf2 p040: batt insulation orientation incorrect
    ("pdf2_p040_i01.jpeg", "insulation_04.jpeg"),
    ("pdf2_p040_i02.jpeg", "insulation_05.jpeg"),

    # ── Appliances ───────────────────────────────────────────────────────────
    # pdf2 p047: oven/range with no anti-tip bracket
    ("pdf2_p047_i01.jpeg", "appliance_01.jpeg"),
    ("pdf2_p047_i02.jpeg", "appliance_02.jpeg"),
    # pdf2 p048: infrared photos of kitchen appliances
    ("pdf2_p048_i01.jpeg", "appliance_03.jpeg"),

    # ── Garage ───────────────────────────────────────────────────────────────
    # pdf2 p041: garage door / opener overview
    ("pdf2_p041_i03.jpeg", "garage_01.jpeg"),
    ("pdf2_p041_i05.jpeg", "garage_02.jpeg"),
    # pdf2 p043: improper framing in garage ceiling
    ("pdf2_p043_i01.jpeg", "garage_03.jpeg"),
    ("pdf2_p043_i02.jpeg", "garage_04.jpeg"),
    # pdf2 p045: moisture in garage walls
    ("pdf2_p045_i01.jpeg", "garage_05.jpeg"),
    ("pdf2_p045_i02.jpeg", "garage_06.jpeg"),

    # ── Site and Grounds ─────────────────────────────────────────────────────
    # pdf2 p023: driveway settlement / shrinkage cracking
    ("pdf2_p023_i01.jpeg", "site_01.jpeg"),
    ("pdf2_p023_i02.jpeg", "site_02.jpeg"),
    # pdf2 p024: patio moderate cracking
    ("pdf2_p024_i01.jpeg", "site_03.jpeg"),
    # pdf1 p018: vegetation overgrowth against house
    ("pdf1_p018_i01.jpeg", "site_04.jpeg"),
    ("pdf1_p010_i01.jpeg", "site_05.jpeg"),  # gutter downspout extension needed
]


def main():
    copied = 0
    skipped = 0
    for src_name, dst_name in MAPPING:
        src = SRC / src_name
        dst = DST / dst_name
        if not src.exists():
            print(f"  MISSING  {src_name}")
            skipped += 1
            continue
        shutil.copy2(src, dst)
        size_kb = dst.stat().st_size // 1024
        print(f"  OK  {dst_name}  ({size_kb}KB)  ← {src_name}")
        copied += 1

    print(f"\nDone: {copied} copied, {skipped} missing")
    print(f"demo_photos/ now has {len(list(DST.iterdir()))} files")


if __name__ == "__main__":
    main()
