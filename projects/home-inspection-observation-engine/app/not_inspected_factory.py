"""
Factory for not-inspected observations. One LLM call classifies the reason,
identifies the system/component/area, and generates a professional description.
No image analysis, no EOL assessment — much lighter than the main observation pipeline.
"""

import json
from datetime import datetime, timezone
from typing import Optional

from app.schemas import NotInspectedObservation, NotInspectedLLMOutput
from app.llm_client import get_client, get_llm_provider


NOT_INSPECTED_SYSTEM_PROMPT = """You are an assistant helping home inspectors document components they could not inspect.
Given the inspector's notes or audio transcript, classify why the component was not inspected
and generate a concise, professional description suitable for inclusion in a report.
Be precise — only use the reason code that best fits the evidence. Do not guess."""

# Mirrors NotInspectedReason enum values with plain-English descriptions.
# Used in the prompt so the LLM knows what each code means.
_REASON_DESCRIPTIONS = {
    "access_blocked":        "Could not be reached — blocked by furnishings, storage, or debris",
    "access_locked":         "Access denied — locked door or owner unavailable",
    "concealed_materials":   "Hidden behind finished surfaces (drywall, insulation, flooring, etc.)",
    "concealed_property":    "Covered by personal belongings",
    "safety_electrical":     "Active electrical hazard — unsafe to inspect",
    "safety_structural":     "Structural instability — unsafe to enter or access",
    "safety_environmental":  "Suspected environmental hazard (asbestos, mold, gas leak, etc.)",
    "conditions_seasonal":   "System is off-season and could not be safely tested",
    "conditions_inoperable": "Utility disconnected or system non-functional",
    "scope_excluded":        "Excluded by the inspection agreement or contract",
    "scope_specialist":      "Deferred to a licensed specialist (pool, septic, well, elevator, etc.)",
    "demolished":            "Component has been demolished or removed from the property",
}


def build_not_inspected_prompt(
    text_description: Optional[str],
    audio_transcript: Optional[str],
) -> str:
    parts = []
    if text_description:
        parts.append(f"Inspector notes: {text_description}")
    if audio_transcript:
        parts.append(f"Audio transcript: {audio_transcript}")

    input_text = "\n".join(parts) if parts else "(No description provided)"
    reason_list = "\n".join(
        f"  {code}: {desc}" for code, desc in _REASON_DESCRIPTIONS.items()
    )

    return f"""{input_text}

Classify this not-inspected observation using exactly one of these reason codes:
{reason_list}

Also identify:
  - system: the home system category (Roofing, Exterior, Structure, Electrical, Plumbing, HVAC,
    Interior, Insulation and Ventilation, Appliances, Site and Grounds, Garage, or Other)
  - component: the specific component not inspected (e.g. "main electrical panel", "attic insulation")
  - room_or_area: the location (e.g. "basement", "master bathroom", "exterior south wall")
  - description: one professional sentence stating what was not inspected and the reason
    (suitable for a formal home inspection report)
"""


def classify_not_inspected(
    not_inspected_id: str,
    inspection_id: Optional[int],
    text_description: Optional[str],
    audio_transcript: Optional[str],
    photo_ids: Optional[list] = None,
) -> NotInspectedObservation:
    """
    Run the LLM classification for a not-inspected observation.
    Returns a fully-populated NotInspectedObservation ready to persist.
    """
    prompt = build_not_inspected_prompt(text_description, audio_transcript)
    client = get_client()
    provider = get_llm_provider()
    schema = NotInspectedLLMOutput.model_json_schema()

    if provider == "anthropic":
        response = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=512,
            system=NOT_INSPECTED_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            tools=[{
                "name": "submit_not_inspected",
                "description": "Submit the not-inspected classification.",
                "input_schema": schema,
            }],
            tool_choice={"type": "tool", "name": "submit_not_inspected"},
        )
        data = response.content[0].input

    elif provider == "openai":
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": NOT_INSPECTED_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "NotInspectedLLMOutput",
                    "schema": schema,
                    "strict": False,
                },
            },
        )
        data = json.loads(response.choices[0].message.content)

    result = NotInspectedLLMOutput(**data)

    return NotInspectedObservation(
        id=not_inspected_id,
        inspection_id=inspection_id,
        system=result.system,
        room_or_area=result.room_or_area,
        component=result.component,
        reason=result.reason,
        description=result.description,
        text_description=text_description,
        audio_transcript=audio_transcript,
        photo_ids=photo_ids or [],
        created_at=datetime.now(timezone.utc),
    )
