"""
Node 4: Image Describer

Runs a vision LLM call for every image extracted from the PDF.
Produces a plain-text description + metadata used by the image_matcher node.

Key design: vision is expensive — we run it ONCE per image here, upfront.
All downstream matching work happens in text space, reusing these descriptions.

Non-inspection images (logos, maps, diagrams, signatures) are flagged skip=True
and excluded from matching.
"""

from typing import Optional
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from ..config import get_llm
from ..prompts import DESCRIBE_IMAGE_PROMPT
from ..state import ImportState


class ImageDescription(BaseModel):
    description: str
    likely_system: Optional[str] = None   # e.g. "Roofing", "Electrical", "Plumbing"
    visible_defect: bool = False
    skip: bool = False                    # True = not an inspection photo
    skip_reason: Optional[str] = None


def _describe_single_image(llm, img: dict) -> ImageDescription:
    message = HumanMessage(content=[
        {
            "type": "text",
            "text": DESCRIBE_IMAGE_PROMPT,
        },
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/{img['ext']};base64,{img['bytes_b64']}"
            },
        },
    ])
    return llm.invoke([message])


def run(state: ImportState) -> dict:
    errors = list(state.get("errors", []))
    images = state.get("images", [])

    if not images:
        print("[image_describer] No images to describe.")
        return {"images": images, "errors": errors}

    llm = get_llm(temperature=0.0).with_structured_output(ImageDescription)
    updated_images = []
    skipped = 0

    for img in images:
        try:
            result: ImageDescription = _describe_single_image(llm, img)
            updated_images.append({
                **img,
                "description": result.description,
                "likely_system": result.likely_system,
                "visible_defect": result.visible_defect,
                "skip": result.skip,
                "skip_reason": result.skip_reason,
            })
            if result.skip:
                skipped += 1
        except Exception as e:
            errors.append(f"Image description failed for index {img['index']}: {e}")
            updated_images.append({**img, "skip": True, "skip_reason": f"description error: {e}"})

    inspection_images = len(updated_images) - skipped
    print(f"[image_describer] {len(images)} images processed: {inspection_images} inspection photos, {skipped} skipped")

    return {"images": updated_images, "errors": errors}
