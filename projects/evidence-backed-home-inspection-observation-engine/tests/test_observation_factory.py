from app.observation_factory import create_basic_structured_observation
from app.schemas import ObservationInput, ObservationStatus, StructuredObservation


def test_complete_input_creates_ready_for_review_observation():
    observation_input = ObservationInput(
        text_description="active leak under kitchen sink",
        photo_ids=["kitchen_sink_001.jpg"]
    )

    observation = create_basic_structured_observation(
        observation_id="obs_001",
        observation_input=observation_input,
    )

    assert isinstance(observation, StructuredObservation)
    assert observation.observation_id == "obs_001"
    assert observation.status == ObservationStatus.READY_FOR_REVIEW
    assert observation.photo_ids == ["kitchen_sink_001.jpg"]
    assert observation.missing_information == []
    assert observation.needs_human_review is True
