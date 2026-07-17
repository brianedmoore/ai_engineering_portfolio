import pytest
from unittest.mock import patch, MagicMock
from app.image_analysis import analyze_image


def test_analyze_image_anthropic(tmp_path):
    image_file = tmp_path / "test.jpg"
    image_file.write_bytes(b"fake image content")

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="cracked drywall near window frame")]

    with patch("app.image_analysis.get_llm_provider", return_value="anthropic"), \
         patch("app.image_analysis.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.messages.create.return_value = mock_response

        result = analyze_image(str(image_file))

    assert result == "cracked drywall near window frame"
    mock_client.messages.create.assert_called_once()


def test_analyze_image_openai(tmp_path):
    image_file = tmp_path / "test.jpg"
    image_file.write_bytes(b"fake image content")

    mock_response = MagicMock()
    mock_response.choices[0].message.content = "water stain on ceiling tile"

    with patch("app.image_analysis.get_llm_provider", return_value="openai"), \
         patch("app.image_analysis.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create.return_value = mock_response

        result = analyze_image(str(image_file))

    assert result == "water stain on ceiling tile"
    mock_client.chat.completions.create.assert_called_once()


def test_analyze_image_unsupported_provider(tmp_path):
    image_file = tmp_path / "test.jpg"
    image_file.write_bytes(b"fake image content")

    with patch("app.image_analysis.get_llm_provider", return_value="gemini"), \
         patch("app.image_analysis.get_client"):
        with pytest.raises(ValueError, match="Unsupported provider"):
            analyze_image(str(image_file))
