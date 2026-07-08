from app.schemas import ObservationInput, SourceInputType


def test_photo_and_text_is_complete():
    observation = ObservationInput(
        text_description="active leak under kitchen sink",
        photo_ids=["kitchen_sink_001.jpg"]
    )

    assert observation.is_complete is True
    assert observation.source_input_type == SourceInputType.TEXT
    assert observation.missing_information == []
