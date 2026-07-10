SYSTEM_PROMPT = """You are an assistant that helps home inspectors document observations.
You will be given field notes and/or an audio transcript from an inspector.
Your job is to extract and classify the observation into structured fields.
Be precise and conservative — only populate fields you have clear evidence for.
"""

def build_observation_prompt(observation_input) -> str:
    parts = []

    if observation_input.text_description:
        parts.append(f"Field notes: {observation_input.text_note}")

    if observation_input.audio_transcript:
        parts.append(f"Audio transcript: {observation_input.audio_transcript}")

    if observation_input.photo_ids:
        parts.append(f"Photos referenced: {', '.join(observation_input.photo_ids)}")

    input_text = "\n".join(parts)

    return f"""{input_text}

Based on the above, return a JSON object with exactly these fields:
{{
  "title": "short descriptive title of the defect",
  "room_or_area": "location in the home",
  "system": "one of: Roofing, Structural, Electrical, Plumbing, HVAC, Insulation, Exterior, Interior, Appliances, Site, Other",
  "component": "specific component (e.g. P-trap, outlet, fascia board)",
  "defect_type": "what is wrong (e.g. active leak, missing cover plate)",
  "severity": "one of: Low, Medium, High",
  "safety_related": true or false,
  "professional_report_description": "formal language suitable for a written report",
  "plain_english_summary": "simple explan
  "recommended_action": "what should be done",
  "responsible_professional": "who should
  "estimated_cost_range": "one of: Under $100, $100-$300, $300-$750, $750-$2000, $2000-$5000, Over $5000,
Unknown",
  "confidence": 0.0 to 1.0
}}
Return only the JSON object. No explanation, no markdown, no code fences.
"""
