import os
import anthropic
import openai
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic").lower()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def get_llm_provider() -> str:
    return LLM_PROVIDER

def get_client():
    if LLM_PROVIDER == "anthropic":
        return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    elif LLM_PROVIDER == "openai":
        return openai.OpenAI(api_key=OPENAI_API_KEY)
    else:
        raise ValueError(f"Unsupported LLM_PROVIDER: '{LLM_PROVIDER}'. Must be 'anthropic' or 'openai'.")