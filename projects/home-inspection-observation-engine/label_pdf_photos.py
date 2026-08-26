"""
Extract every qualifying photo from sample_inspection_2.pdf, label each one
with a descriptive name using Claude Vision, and produce:

  sample_inspection_2_photos/
    roof_drone_overview_si2_01.jpeg
    electrical_panel_interior_si2_01.jpeg
    ...

  sample_inspection_2_mapping.json
    [
      {
        "filename": "roof_drone_overview_si2_01.jpeg",
        "page": 25,
        "system": "Roofing",
        "label": "roof drone overview",
        "observation_text": "Roof Covering Material: Architectural Composition Shingles..."
      },
      ...
    ]

Usage (from project root, venv active):
    python label_pdf_photos.py

Requires ANTHROPIC_API_KEY in environment or .env file.
"""

import base64
import json
import os
import time
from pathlib import Path
from collections import defaultdict

import pymupdf  # pip install PyMuPDF
import openai
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PDF_PATH   = Path("sample_inspection_2.pdf")
OUT_DIR    = Path("sample_inspection_2_photos")
MAP_FILE   = Path("sample_inspection_2_mapping.json")
SOURCE_TAG = "si2"            # appended to every filename
MIN_WIDTH  = 300
MIN_HEIGHT = 200
MIN_BYTES  = 15_000           # skip tiny images / icons
SLEEP_SEC  = 0.3             # between API calls to avoid rate-limit bursts

SYSTEMS = [
    "Roofing", "Exterior", "Structure", "Electrical", "Plumbing",
    "HVAC", "Water Heater", "Interior", "Insulation", "Appliances",
    "Garage", "Site and Grounds", "General / Cover",
]

LABEL_PROMPT = """\
You are labeling a photo extracted from a home inspection report.

Page context text (surrounding the photo in the PDF):
\"\"\"
{page_text}
\"\"\"

Tasks:
1. Look at the photo and the context text.
2. Write a short 2-4 word SNAKE_CASE description of what the photo physically shows.
   - Good: "roof_shingles_missing", "electrical_panel_open", "garage_framing_damage"
   - Bad: "photo_of_house", "image_1", "inspection_finding"
3. Pick the best system from this list: {systems}

Reply with JSON only, no explanation:
{{"label": "short_snake_case_description", "system": "System Name"}}
"""


def extract_images(pdf_path: Path) -> list[dict]:
    """Return list of dicts with page_num, image_bytes, ext, page_text."""
    doc = pymupdf.open(str(pdf_path))
    results = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_text = page.get_text().strip()[:1500]  # first 1500 chars of page text

        for img_info in page.get_images():
            xref = img_info[0]
            try:
                pix = pymupdf.Pixmap(doc, xref)
            except Exception:
                continue

            # Convert CMYK/other colorspaces to RGB
            if pix.n > 4:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)

            if pix.width < MIN_WIDTH or pix.height < MIN_HEIGHT:
                continue

            img_bytes = pix.tobytes("jpeg")
            if len(img_bytes) < MIN_BYTES:
                continue

            results.append({
                "page_num": page_num + 1,
                "img_bytes": img_bytes,
                "ext": "jpeg",
                "page_text": page_text,
            })

    doc.close()
    return results


def label_image(client: openai.OpenAI, img_bytes: bytes, page_text: str) -> dict:
    """Call GPT-4o mini Vision and return {label, system}."""
    b64 = base64.standard_b64encode(img_bytes).decode()
    prompt = LABEL_PROMPT.format(
        page_text=page_text or "(no text on this page)",
        systems=", ".join(SYSTEMS),
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"}},
                {"type": "text", "text": prompt},
            ],
        }],
    )

    raw = resp.choices[0].message.content.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        result = json.loads(raw)
        label = result.get("label", "unlabeled").lower().replace(" ", "_").replace("-", "_")
        system = result.get("system", "General")
        return {"label": label, "system": system}
    except Exception:
        return {"label": "unlabeled", "system": "General"}


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise SystemExit("ANTHROPIC_API_KEY not set. Add it to .env or export it.")

    client = anthropic.Anthropic(api_key=api_key)
    OUT_DIR.mkdir(exist_ok=True)

    print(f"Extracting images from {PDF_PATH}...")
    images = extract_images(PDF_PATH)
    print(f"Found {len(images)} qualifying images. Labeling with Claude...\n")

    # Track how many times each label has been used → deduplicate filenames
    label_counts: dict[str, int] = defaultdict(int)
    mapping = []

    for i, img in enumerate(images, 1):
        print(f"  [{i:3d}/{len(images)}] page {img['page_num']:3d}  ", end="", flush=True)

        result = label_image(client, img["img_bytes"], img["page_text"])
        label  = result["label"]
        system = result["system"]

        label_counts[label] += 1
        n = label_counts[label]
        filename = f"{label}_{SOURCE_TAG}_{n:02d}.jpeg"

        out_path = OUT_DIR / filename
        out_path.write_bytes(img["img_bytes"])

        size_kb = len(img["img_bytes"]) // 1024
        print(f"→ {filename}  ({size_kb}KB)  [{system}]")

        mapping.append({
            "filename": filename,
            "page": img["page_num"],
            "system": system,
            "label": label.replace("_", " "),
            "observation_text": img["page_text"],
        })

        if i < len(images):
            time.sleep(SLEEP_SEC)

    MAP_FILE.write_text(json.dumps(mapping, indent=2))
    print(f"\nDone. {len(mapping)} photos → {OUT_DIR}/")
    print(f"Mapping → {MAP_FILE}")

    # Summary by system
    from collections import Counter
    counts = Counter(m["system"] for m in mapping)
    print("\nBy system:")
    for sys, cnt in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {sys}: {cnt}")


if __name__ == "__main__":
    main()
