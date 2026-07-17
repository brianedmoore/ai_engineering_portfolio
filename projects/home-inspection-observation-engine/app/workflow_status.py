from app.schemas import ObservationInput, ObservationStatus


def determine_observation_status(observation_input: ObservationInput) -> ObservationStatus:
    if observation_input.is_complete:
        return ObservationStatus.READY_FOR_REVIEW

    return ObservationStatus.INCOMPLETE
