import os
import openai
from dotenv import load_dotenv

load_dotenv()


def transcribe_audio(file_path: str) -> str:
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
    return transcript.text