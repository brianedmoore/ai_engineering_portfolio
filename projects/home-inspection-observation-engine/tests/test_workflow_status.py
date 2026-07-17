from app.schemas import ObservationInput, ObservationStatus
from app.workflow_status import determine_observation_status


def test_complete_observation_input_is_ready_for_review():
    observation = ObservationInput(
        text_description="active leak under kitchen sink",
        photo_ids=["kitchen_sink_001.jpg"]
    )

    status = determine_observation_status(observation)

    assert status == ObservationStatus.READY_FOR_REVIEW


def test_incomplete_observation_input_is_incomplete():
    observation = ObservationInput(
        text_description="active leak under kitchen sink"
    )

    status = determine_observation_status(observation)

    assert status == ObservationStatus.INCOMPLETE
