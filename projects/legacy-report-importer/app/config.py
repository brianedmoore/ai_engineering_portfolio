"""
Path setup and shared LLM factory.

Adds the sibling home-inspection-observation-engine project to sys.path so we
can import its schemas and system_descriptors directly without duplicating them.
"""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
OBSERVATION_ENGINE = REPO_ROOT / "home-inspection-observation-engine"

if str(OBSERVATION_ENGINE) not in sys.path:
    sys.path.insert(0, str(OBSERVATION_ENGINE))

import os
from langchain_openai import ChatOpenAI

# gpt-4o-mini: cheapest OpenAI model with vision support (required for image_describer).
# Override with IMPORTER_LLM_MODEL env var.
DEFAULT_MODEL = os.getenv("IMPORTER_LLM_MODEL", "gpt-4o-mini")

# LangSmith tracing — set LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY to enable.
# Free tier: 5,000 traces/month at smith.langchain.com


def get_llm(temperature: float = 0.0) -> ChatOpenAI:
    return ChatOpenAI(model=DEFAULT_MODEL, temperature=temperature)
