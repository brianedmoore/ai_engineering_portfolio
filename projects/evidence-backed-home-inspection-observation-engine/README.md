# Evidence-Backed Home Inspection Observation Engine

This project is a production-style AI workflow for converting unordered home inspection field inputs into a structured, professional inspection observation.

The core problem: home inspectors often document findings in the field by taking photos, typing quick notes, or recording audio. These inputs may happen in any order, but a reportable observation should include both visual evidence (photo) and a written description (text input or audio transcription).

This project focuses on the smallest valuable unit of a home inspection report: one evidence-backed observation.

## MVP Scope

Version 1 supports a single inspection observation.

A complete observation requires:

- At least one photo
- At least one text description (from text or audio input)
- A generated proffessional inspection description for clients
- A title
- A room or area classification
- A home system classification
- A severity classification
- A recommended next action
- A responsible professional or homeowner action
- A human-review flag

## Example Workflow

```text
Inspector notices an issue in the field
   |
   v
Inspector captures one or more photos
   |
   v
Inspector adds either typed notes or audio narration
   |
   v
System validates that required evidence is present
   |
   v
System generates a structured observation
   |
   v
Inspector reviews, edits, and approves
```

## Example Input
Photo: kitchen_sink_001.jpg

Typed note:
active leak under kitchen sink, cabinet base wet, drip at p trap

## Example Output

{
  "observation_id": "obs_001",
  "status": "Ready for Review",
  "title": "Active Leak Below Kitchen Sink",
  "room_or_area": "Kitchen",
  "system": "Plumbing",
  "component": "Sink Drain / P-Trap",
  "defect_type": "Active leak",
  "severity": "Medium",
  "safety_related": false,
  "professional_report_description": "An active leak was observed below the kitchen sink at the drain piping. Moisture was present at the cabinet base below the sink. Repair by a qualified plumbing contractor is recommended.",
  "plain_english_summary": "There is an active leak under the kitchen sink that may damage the cabinet and nearby materials if not corrected.",
  "recommended_action": "Repair the leak and evaluate affected cabinet materials for moisture damage.",
  "responsible_professional": "Plumber",
  "estimated_cost_range": "$150–$500",
  "photo_ids": ["kitchen_sink_001.jpg"],
  "source_input_type": "Text",
  "confidence": 0.82,
  "needs_human_review": true,
  "missing_information": []
}

## What This Project Demonstrates

This project demonstrates practical AI engineering for a real-world field workflow:

- Product decomposition
- Domain modeling
- Multimodal workflow design
- Structured LLM outputs
- Pydantic validation
- Human-in-the-loop review
- Evaluation-first AI development
- Backend API design
- AI reliability and guardrail design
- Business process automation

## Current Project Structure
```text
evidence-backed-home-inspection-observation-engine/
  app/
    __init__.py
    schemas.py
    workflow_status.py
    load_sample_observations.py
  data/
    sample_observations.jsonl
  docs/
    product_brief.md
    workflow.md
    schema_notes.md
  tests/
    __init__.py
    test_observation_input.py
    test_workflow_status.py
    test_load_sample_observations.py
  requirements.txt
  README.md
```

## Status

Project definition and schema design phase.

## Running Tests

From this project folder, install dependencies:

```bash
pip install -r requirements.txt
```

Then run:

```bash
pytest
```
