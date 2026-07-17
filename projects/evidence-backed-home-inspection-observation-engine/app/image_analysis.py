import base64
import mimetypes
from app.llm_client import get_client, get_llm_provider
from dotenv import load_dotenv

load_dotenv()

_PROMPT = (
    "You are a home inspection assistant. Analyze this image and describe: "
    "what component or area of the home is shown, any visible defects, damage, "
    "deterioration, or concerns, and the overall condition. "
    "Focus on factual observations relevant to a home inspection report."
)


def analyze_image(file_path: str) -> str:
    with open(file_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    media_type, _ = mimetypes.guess_type(file_path)
    if media_type is None:
        media_type = "image/jpeg"

    client = get_client()
    provider = get_llm_provider()

    if provider == "anthropic":
        response = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {"type": "text", "text": _PROMPT},
                ],
            }],
        )
        return response.content[0].text

    elif provider == "openai":
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{image_data}"},
                    },
                    {"type": "text", "text": _PROMPT},
                ],
            }],
        )
        return response.choices[0].message.content

    else:
        raise ValueError(f"Unsupported provider for image analysis: {provider}")
