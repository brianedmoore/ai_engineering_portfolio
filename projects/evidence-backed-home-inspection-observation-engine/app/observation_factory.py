import json
from app.schemas import (
    ObservationInput, StructuredObservation, ObservationStatus,
    Severity, HomeSystem, ResponsibleProfessional, EstimatedCostRange
)
from app.workflow_status import determine_observation_status
from app.llm_client import get_client, get_llm_provider
from app.prompts import SYSTEM_PROMPT, build_observation_prompt


def create_basic_structured_observation(observation_id: str, observation_input: ObservationInput) -> StructuredObservation:
    status = determine_observation_status(observation_input)

    if status == ObservationStatus.INCOMPLETE:
        return StructuredObservation(
            observation_id=observation_id,
            status=ObservationStatus.INCOMPLETE,
            missing_information=observation_input.missing_information,
            confidence=0.0
        )

    prompt = build_observation_prompt(observation_input)
    client = get_client()
    provider = get_llm_provider()

    if provider == "anthropic":
        response = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text
    elif provider == "openai":
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ]
        )
        raw = response.choices[0].message.content

    data = json.loads(raw)

    return StructuredObservation(
        observation_id=observation_id,
        status=ObservationStatus.READY_FOR_REVIEW,
        title=data["title"],
        room_or_area=data["room_or_area"],
        system=HomeSystem(data["system"]),
        component=data["component"],
        defect_type=data["defect_type"],
        severity=Severity(data["severity"]),
        safety_related=data["safety_related"],
        professional_report_description=data["professional_report_description"],
        plain_english_summary=data["plain_english_summary"],
        recommended_action=data["recommended_action"],
        responsible_professional=ResponsibleProfessional(data["responsible_professional"]),
        estimated_cost_range=EstimatedCostRange(data["estimated_cost_range"]),
        confidence=data["confidence"],
        missing_information=[],
        photo_ids=observation_input.photo_ids,
        source_input_type=observation_input.source_input_type
    )