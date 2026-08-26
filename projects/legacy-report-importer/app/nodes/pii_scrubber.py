"""
Node 2: PII Scrubber

Two-step approach:
  1. LLM extracts PII into structured fields (client name, address, inspector info).
     These become the Inspection/Inspector DB records — we WANT this data.
  2. Regex + string replacement scrubs those values from the report body text.
     The scrubbed text is safe to store as training data or observation source text.
"""

import re
from typing import Optional
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from ..config import get_llm
from ..prompts import PII_EXTRACT_PROMPT
from ..state import ImportState


class PIIExtraction(BaseModel):
    client_name: Optional[str] = None
    property_address: Optional[str] = None
    inspector_name: Optional[str] = None
    inspector_company: Optional[str] = None
    inspector_license: Optional[str] = None
    inspector_phone: Optional[str] = None
    inspector_email: Optional[str] = None
    inspection_date: Optional[str] = None    # raw string, parsed later
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    realtor_name: Optional[str] = None


def _scrub_text(text: str, pii: PIIExtraction) -> str:
    scrubbed = text

    # Regex-based scrubbing first (catches anything the LLM might have missed)
    scrubbed = re.sub(r"[\w.+\-]+@[\w\-]+\.[a-zA-Z.]+", "[EMAIL]", scrubbed)
    scrubbed = re.sub(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b", "[PHONE]", scrubbed)
    # License number patterns (e.g. "License #12345", "Lic. 987654")
    scrubbed = re.sub(r"(?i)(lic(?:ense)?\.?\s*#?\s*)\d{4,}", r"\1[LICENSE]", scrubbed)

    # Replace specific PII values extracted by the LLM
    replacements = {
        pii.client_name: "[CLIENT NAME]",
        pii.inspector_name: "[INSPECTOR NAME]",
        pii.inspector_company: "[COMPANY]",
        pii.inspector_license: "[LICENSE]",
        pii.realtor_name: "[AGENT NAME]",
    }
    for value, placeholder in replacements.items():
        if value and len(value) > 2:  # skip trivially short strings
            # Case-insensitive replacement
            pattern = re.compile(re.escape(value), re.IGNORECASE)
            scrubbed = pattern.sub(placeholder, scrubbed)

    # Address: keep the street address for the DB but scrub client-adjacent references.
    # We DON'T fully scrub the property address from the text since the report often
    # mentions "at this property" in generic ways — only scrub explicit full addresses.
    if pii.property_address and len(pii.property_address) > 10:
        pattern = re.compile(re.escape(pii.property_address), re.IGNORECASE)
        scrubbed = pattern.sub("[PROPERTY ADDRESS]", scrubbed)

    return scrubbed


def run(state: ImportState) -> dict:
    errors = list(state.get("errors", []))
    raw_text = state.get("raw_text", "")

    llm = get_llm().with_structured_output(PIIExtraction)

    # Use first 4000 chars — PII is almost always in the header section
    sample = raw_text[:4000]
    prompt = PII_EXTRACT_PROMPT.format(text=sample)

    try:
        pii: PIIExtraction = llm.invoke([HumanMessage(content=prompt)])
    except Exception as e:
        errors.append(f"PII extraction failed: {e}")
        return {
            "scrubbed_text": raw_text,
            "extracted_pii": {},
            "errors": errors,
        }

    scrubbed = _scrub_text(raw_text, pii)

    print(f"[pii_scrubber] Extracted: client={pii.client_name}, address={pii.property_address}, inspector={pii.inspector_name}")

    return {
        "scrubbed_text": scrubbed,
        "extracted_pii": pii.model_dump(exclude_none=True),
        "errors": errors,
    }
