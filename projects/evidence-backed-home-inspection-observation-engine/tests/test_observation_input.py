from app.schemas import ObservationInput, SourceInputType


def test_photo_and_text_is_complete():
    observation = ObservationInput(
        text_description="active leak under kitchen sink",
        photo_ids=["kitchen_sink_001.jpg"]
    )

    assert observation.is_complete is True
    assert observation.source_input_type == SourceInputType.TEXT
    assert observation.missing_information == []

def test_photo_and_audio_is_complete():
    observation = ObservationInput(
        audio_transcript="damaged exterior trim near rear window",
        photo_ids=["rear_trim_001.jpg"]
    )

    assert observation.is_complete is True
    assert observation.source_input_type == SourceInputType.AUDIO
    assert observation.missing_information == []

def test_text_only_is_incomplete_without_photo():
    observation = ObservationInput(
        text_description="active leak under kitchen sink"
    )

    assert observation.is_complete is False
    assert observation.source_input_type == SourceInputType.TEXT
    assert observation.missing_information == ["At least one photo is required."]
