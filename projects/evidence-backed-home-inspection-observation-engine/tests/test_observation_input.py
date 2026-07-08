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

def test_photo_only_is_incomplete_without_description():
    observation = ObservationInput(
        photo_ids=["kitchen_sink_001.jpg"]
    )

    assert observation.is_complete is False
    assert observation.source_input_type == SourceInputType.MISSING
    assert observation.missing_information == ["A typed description or audio transcript is required."]

def test_blank_text_with_photo_is_incomplete():
    observation = ObservationInput(
        text_description="   ",
        photo_ids=["kitchen_sink_001.jpg"]
    )

    assert observation.is_complete is False
    assert observation.source_input_type == SourceInputType.MISSING
    assert observation.missing_information == ["A typed description or audio transcript is required."]

def test_text_and_audio_is_complete():
    observation = ObservationInput(
        text_description="active leak under kitchen sink",
        audio_transcript="cabinet base is wet and there is a drip at the p trap",
        photo_ids=["kitchen_sink_001.jpg"]
    )

    assert observation.is_complete is True
    assert observation.source_input_type == SourceInputType.TEXT_AND_AUDIO
    assert observation.missing_information == []
