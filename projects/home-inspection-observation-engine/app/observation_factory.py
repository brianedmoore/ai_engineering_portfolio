import json
import logging
from typing import Optional
from sqlmodel import Session
from app.schemas import (
    ObservationInput, StructuredObservation, ObservationStatus,
    LLMObservationOutput, Inspection, SubCategory, Severity
)
from app.workflow_status import determine_observation_status
from app.llm_client import get_client, get_llm_provider
from app.prompts import SYSTEM_PROMPT, build_observation_prompt
from app.token_tracking import extract_token_usage
from app.eol_engine import assess_eol


def create_basic_structured_observation(
    observation_id: str,
    observation_input: ObservationInput,
    session: Optional[Session] = None,
    inspection_id: Optional[int] = None,
) -> StructuredObservation:
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
        usage = extract_token_usage(response, provider, "claude-sonnet-5")

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
        usage = extract_token_usage(response, provider, "gpt-4o")

    result = LLMObservationOutput(**data)

    # Apply EOL rules engine
    eol_flag, eol_source, eol_reasoning = assess_eol(
        result.eol_component_key,
        result.eol_detected_age_years,
    )

    # Resolve sub_category: use LLM output; if EOL engine fires on a Deficiency, override to End of Life
    sub_category = result.sub_category
    if eol_flag and result.severity == Severity.DEFICIENCY:
        sub_category = SubCategory.END_OF_LIFE

    # Apply system profile updates to the Inspection row when we have a session
    if session and inspection_id and result.system_profile_updates:
        _apply_system_profile_updates(session, inspection_id, result.system_profile_updates)

    return StructuredObservation(
        observation_id=observation_id,
        status=ObservationStatus.READY_FOR_REVIEW,
        title=result.title,
        room_or_area=result.room_or_area,
        system=result.system,
        component=result.component,
        defect_type=result.defect_type,
        severity=result.severity,
        sub_category=sub_category,
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
        source_input_type=observation_input.source_input_type,
        approaching_end_of_life=eol_flag,
        eol_source=eol_source,
        eol_reasoning=eol_reasoning,
        llm_usage=[usage.to_dict()]
    )


def _apply_system_profile_updates(
    session: Session,
    inspection_id: int,
    updates: dict,
) -> None:
    """
    Merge LLM-extracted system descriptor values into the Inspection row.

    Rules:
    - Only sets a field if the value is non-None.
    - Never overwrites a field the inspector already confirmed (source == "confirmed").
    - Marks every field it touches as "inferred" in system_profile_sources.
    - Does NOT commit — the caller (API endpoint) owns the transaction.
    """
    inspection = session.get(Inspection, inspection_id)
    if not inspection:
        logging.warning("system_profile_updates skipped — inspection %s not found", inspection_id)
        return

    sources: dict = dict(inspection.system_profile_sources or {})
    changed = False

    for col_name, value in updates.items():
        if value is None:
            continue
        if not hasattr(inspection, col_name):
            logging.debug("system_profile_updates: unknown column %s, skipping", col_name)
            continue
        if sources.get(col_name) == "confirmed":
            continue  # Inspector explicitly set this — do not overwrite

        setattr(inspection, col_name, value)
        sources[col_name] = "inferred"
        changed = True

    if changed:
        inspection.system_profile_sources = sources
        session.add(inspection)
