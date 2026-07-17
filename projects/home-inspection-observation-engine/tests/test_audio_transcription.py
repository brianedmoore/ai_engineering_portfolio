from unittest.mock import patch, MagicMock
from app.audio_transcription import transcribe_audio

# We mock the OpenAI client here to avoid real API calls in tests (cost + network dependency).
# patch() intercepts the openai.OpenAI constructor inside the module and replaces it with a
# mock that returns a fake transcript. tmp_path is a built-in pytest fixture that creates a
# real temp directory so the file open() inside transcribe_audio actually works.
def test_transcribe_audio_returns_transcript(tmp_path):
    audio_file = tmp_path / "test.mp3"
    audio_file.write_bytes(b"fake audio content")

    mock_response = MagicMock()
    mock_response.text = "active leak under the kitchen sink"

    with patch("app.audio_transcription.openai.OpenAI") as mock_client_class:
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.audio.transcriptions.create.return_value = mock_response

        result = transcribe_audio(str(audio_file))

    assert result == "active leak under the kitchen sink"
    mock_client.audio.transcriptions.create.assert_called_once()