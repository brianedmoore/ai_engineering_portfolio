from app.schemas import (
    EstimatedCostRange,
    HomeSystem,
    ObservationInput,
    ObservationStatus,
    ResponsibleProfessional,
    Severity,
    StructuredObservation,
)


def create_basic_structured_observation(
    observation_id: str,
    observation_input: ObservationInput,
) -> StructuredObservation:
    if not observation_input.is_complete:
        return StructuredObservation(
            observation_id=observation_id,
            status=ObservationStatus.INCOMPLETE,
            title="Incomplete Observation",
            room_or_area="Unknown",
            system=HomeSystem.OTHER,
            component="Unknown",
            defect_type="Unknown",
            severity=Severity.LOW,
            safety_related=False,
            professional_report_description="This observation is incomplete and cannot be drafted until required evidence is provided.",
            plain_english_summary="Add at least one photo and one text or audio description to complete this observation.",
            recommended_action="Provide the missing information before generating report language.",
            responsible_professional=ResponsibleProfessional.FURTHER_EVALUATION,
            estimated_cost_range=EstimatedCostRange.UNKNOWN,
            photo_ids=observation_input.photo_ids,
            source_input_type=observation_input.source_input_type,
            confidence=0.0,
            needs_human_review=True,
            missing_information=observation_input.missing_information,
        )

    return StructuredObservation(
        observation_id=observation_id,
        status=ObservationStatus.READY_FOR_REVIEW,
        title="Draft Observation",
        room_or_area="Unknown",
        system=HomeSystem.OTHER,
        component="Unknown",
        defect_type="Unknown",
        severity=Severity.MEDIUM,
        safety_related=False,
        professional_report_description="Draft report language will be generated from the provided field notes and photo evidence.",
        plain_english_summary="This observation has enough information to be reviewed and converted into report language.",
        recommended_action="Review and refine this observation before approval.",
        responsible_professional=ResponsibleProfessional.QUALIFIED_SPECIALIST,
        estimated_cost_range=EstimatedCostRange.UNKNOWN,
        photo_ids=observation_input.photo_ids,
        source_input_type=observation_input.source_input_type,
        confidence=0.5,
        needs_human_review=True,
        missing_information=[],
    )
