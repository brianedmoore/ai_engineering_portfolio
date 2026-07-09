SYSTEM_PROMPT = """You are an assistant that helps home inspectors document observations.
You will be given field notes and/or an audio transcript from an inspector.
Your job is to extract and classify the observation into structured fields.
Be precise and conservative — only populate fields you have clear evidence for.
"""

def build_observation_prompt(observation_input) -> str:
    parts = []

    if observation_input.text_note:
        parts.append(f"Field notes: {observation_input.text_note}")

    if observation_input.audio_transcript:
        parts.append(f"Audio transcript: {observation_input.audio_transcript}")

    if observation_input.photo_ids:
        parts.append(f"Photos referenced: {', '.join(observation_input.photo_ids)}")

    input_text = "\n".join(parts)

    return f"""{input_text}

            Based on the above, extract the following fields:
            - title: short descriptive title of the defect
            - room_or_area: location in the home
            - system: home system affected (e.g. Plumbing, Electrical, Roofing)
            - component: specific component (e.g. P-trap, outlet, fascia board)
            - defect_type: what is wrong (e.g. active leak, missing cover plate)
            - severity: Low, Medium, or High
            - safety_related: true or false
            - professional_report_description: formal language suitable for a written report
            - plain_english_summary: simple explanation for a homeowner
            - recommended_action: what should be done
            - responsible_professional: who should fix it
            - estimated_cost_range: estimated repair cost range
            - confidence: your confidence score from 0.0 to 1.0
            """
