from app.field_guidance import FIELD_GUIDANCE

SYSTEM_PROMPT = """You are an assistant that helps home inspectors document observations.
You will be given field notes and/or an audio transcript from an inspector.
Your job is to extract and classify the observation into structured fields.
Be precise and conservative — only populate fields you have clear evidence for.
"""

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

    input_text = "\n".join(parts)
    guidance_block = _build_field_guidance_block()

    return f"""{input_text}

Use the following field guidance to help classify the observation:
{guidance_block}

Based on the above, return a JSON object with exactly these fields:
{{
  "title": "short descriptive title of the defect",
  "room_or_area": "location in the home",
  "system": "one of: Roofing, Exterior, Structure, Electrical, Plumbing, HVAC, Interior, Insulation and Ventilation, Appliances, Site and Grounds, Garage, Other",
  "component": "specific component (e.g. P-trap, outlet, fascia board)",
  "defect_type": "what is wrong (e.g. active leak, missing cover plate)",
  "severity": "one of: Low, Medium, High",
  "safety_related": true or false,
  "professional_report_description": "formal language suitable for a written report",
  "plain_english_summary": "simple explanation for a homeowner",
  "recommended_action": "what should be done",
  "responsible_professional": "one of: Homeowner/DIY, Handyman, Plumber, Electrician, HVAC Technician, Roofer, Structural Engineer, Foundation Contractor, General Contractor, Appliance Technician, Pest Control Professional, Mold/Water Mitigation Professional, Qualified Specialist, Further Evaluation Recommended",
  "estimated_cost_range": "one of: $0-$100, $100-$300, $300-$750, $750-$2,500, $2,500+, Unknown",
  "confidence": 0.0 to 1.0
}}
Return only the JSON object. No explanation, no markdown, no code fences.
"""