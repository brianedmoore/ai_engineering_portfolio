from app.field_guidance import FIELD_GUIDANCE
from app.rules import EOL_LIFESPANS
from app.system_descriptors import build_llm_extraction_prompt

SYSTEM_PROMPT = """You are an assistant that helps home inspectors document observations.
You will be given field notes and/or an audio transcript from an inspector.
Your job is to extract and classify the observation into structured fields.
Be precise and conservative — only populate fields you have clear evidence for.
"""

def _build_eol_keys_block() -> str:
    """List all valid EOL component keys so the LLM knows what to return."""
    return "\n".join(f"    {key}" for key in EOL_LIFESPANS.keys())


def _build_field_guidance_block() -> str:
    lines = []
    for field, guidance in FIELD_GUIDANCE.items():
        lines.append(f"\nField: {field}")
        lines.append(f"  {guidance['description']}")

        if guidance.get("values"):
            lines.append(f"  Allowed values: {', '.join(guidance['values'])}")

        for criterion in guidance.get("criteria", []):
            lines.append(f"  - {criterion}")

        for example in guidance.get("examples", []):
            lines.append(f"  Good example: {example}")

        for bad in guidance.get("negative_examples", []):
            lines.append(f"  Do not do this: {bad}")

        if guidance.get("note"):
            lines.append(f"  Note: {guidance['note']}")

    return "\n".join(lines)

def build_observation_prompt(observation_input) -> str:
    parts = []

    if observation_input.text_description:
        parts.append(f"Field notes: {observation_input.text_description}")

    if observation_input.audio_transcript:
        parts.append(f"Audio transcript: {observation_input.audio_transcript}")

    if observation_input.photo_ids:
        parts.append(f"Photos referenced: {', '.join(observation_input.photo_ids)}")

    if observation_input.image_descriptions:
        for i, desc in enumerate(observation_input.image_descriptions, 1):
            parts.append(f"Photo {i} description: {desc}")


    input_text = "\n".join(parts)
    guidance_block = _build_field_guidance_block()
    eol_keys_block = _build_eol_keys_block()
    system_profile_block = build_llm_extraction_prompt()

    return f"""{input_text}

Use the following field guidance to classify the observation:
{guidance_block}

Classify the observation using the fields and guidance above.

--- END-OF-LIFE ASSESSMENT ---
If this observation contains evidence of a component's age (from a data plate, serial number sticker, or inspector narration):
  - Set eol_component_key to exactly one of the following valid keys (or null if none applies):
{eol_keys_block}
  - Set eol_detected_age_years to the estimated age in years as a number (e.g. 12.0), or null if not determinable.
Only populate these fields when there is clear age evidence. If no age information is present, set both to null.

--- SYSTEM PROFILE EXTRACTION ---
{system_profile_block}
"""