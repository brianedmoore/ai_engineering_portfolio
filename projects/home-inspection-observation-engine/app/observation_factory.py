import json
from app.schemas import (
    ObservationInput, StructuredObservation, ObservationStatus, LLMObservationOutput
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
            photo_ids=observation_input.photo_ids,
            image_descriptions=observation_input.image_descriptions,
            confidence=0.0
        )

    prompt = build_observation_prompt(observation_input)
    client = get_client()
    provider = get_llm_provider()
    schema = LLMObservationOutput.model_json_schema()

    if provider == "anthropic":
        response = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            tools=[{
                "name": "submit_observation",
                "description": "Submit the structured observation classification.",
                "input_schema": schema
            }],
            tool_choice={"type": "tool", "name": "submit_observation"}
        )
        data = response.content[0].input

    elif provider == "openai":
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "LLMObservationOutput",
                    "schema": schema,
                    "strict": False
                }
            }
        )
        data = json.loads(response.choices[0].message.content)

    result = LLMObservationOutput(**data)

    return StructuredObservation(
        observation_id=observation_id,
        status=ObservationStatus.READY_FOR_REVIEW,
        title=result.title,
        room_or_area=result.room_or_area,
        system=result.system,
        component=result.component,
        defect_type=result.defect_type,
        severity=result.severity,
        safety_related=result.safety_related,
        professional_report_description=result.professional_report_description,
        plain_english_summary=result.plain_english_summary,
        recommended_action=result.recommended_action,
        responsible_professional=result.responsible_professional,
        estimated_cost_range=result.estimated_cost_range,
        confidence=result.confidence,
        missing_information=[],
        photo_ids=observation_input.photo_ids,
        image_descriptions=observation_input.image_descriptions or [],
        source_input_type=observation_input.source_input_type
    )
