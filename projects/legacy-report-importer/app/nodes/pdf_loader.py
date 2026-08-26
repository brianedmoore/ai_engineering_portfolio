"""
Node 1: PDF Loader

Extracts text (per page) and images (with page + position metadata) from the input PDF.
Uses pymupdf (fitz) because it gives us image bounding boxes — critical for location-based
image matching downstream.
"""

import base64
import fitz  # pymupdf

from ..state import ImportState


def run(state: ImportState) -> dict:
    pdf_path = state["pdf_path"]
    errors = list(state.get("errors", []))

    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        return {"errors": errors + [f"Failed to open PDF: {e}"], "raw_text": "", "pages": [], "images": []}

    pages = []
    images = []
    all_text_parts = []
    img_index = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        pages.append({"page_num": page_num, "text": text})
        all_text_parts.append(text)

        # get_images returns a list of (xref, smask, width, height, bpc, colorspace, alt_colorspace, name, filter, referencer)
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                img_bytes = base_image["image"]
                img_ext = base_image.get("ext", "jpeg")

                # Get the bounding box of this image on the page
                rects = page.get_image_rects(xref)
                bbox = tuple(rects[0]) if rects else (0.0, 0.0, 0.0, 0.0)

                # Skip tiny images (< 50x50 px) — likely decorative bullets or icons
                width = img_info[2]
                height = img_info[3]
                if width < 50 or height < 50:
                    continue

                images.append({
                    "index": img_index,
                    "page_num": page_num,
                    "bbox": bbox,
                    "page_text_context": text[:600],  # first 600 chars of page as location context
                    "bytes_b64": base64.b64encode(img_bytes).decode("utf-8"),
                    "ext": img_ext,
                    "description": None,
                    "likely_system": None,
                    "visible_defect": None,
                    "skip": None,
                    "skip_reason": None,
                })
                img_index += 1

            except Exception as e:
                errors.append(f"Failed to extract image xref={xref} on page {page_num}: {e}")

    doc.close()

    print(f"[pdf_loader] {len(pages)} pages, {len(images)} images extracted from {pdf_path}")

    return {
        "raw_text": "\n\n".join(all_text_parts),
        "pages": pages,
        "images": images,
        "errors": errors,
    }
