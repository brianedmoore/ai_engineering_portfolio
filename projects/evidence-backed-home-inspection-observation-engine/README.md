# Evidence-Backed Home Inspection Observation Engine

This project is a production-style AI workflow for converting unordered home inspection field inputs into a structured, professional inspection observation.

The core problem: home inspectors often document findings in the field by taking photos, typing quick notes, or recording audio. These inputs may happen in any order, but a reportable observation should include both visual evidence (photo) and a written description (text input or audio transcription).

This project focuses on the smallest valuable unit of a home inspection report: one evidence-backed observation.

## MVP Scope

Version 1 supports a single inspection observation.

A complete observation requires:

- At least one photo
- At least one text description (from text or audio input)
- A generated professional inspection description for clients
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
System generates a structured observation via LLM
   |
   v
Inspector reviews, edits, and approves
```

## Example Input

```
Photo: kitchen_sink_001.jpg
Typed note: active leak under kitchen sink, cabinet base wet, drip at p trap
```

## Example Output

```json
{
  "observation_id": "obs_001",
  "status": "Ready for Review",
  "title": "Active leak under kitchen sink",
  "room_or_area": "Kitchen",
  "system": "Plumbing",
  "component": "P-trap",
  "defect_type": "Active leak",
  "severity": "High",
  "safety_related": false,
  "professional_report_description": "The inspector observed an active leak under the kitchen sink, resulting in a wet cabinet base.",
  "plain_english_summary": "There is a leak under your kitchen sink causing the cabinet base to be wet. This needs to be fixed to prevent further damage.",
  "recommended_action": "Have a licensed plumber repair the leak and assess any water damage to the cabinet.",
  "responsible_professional": "Plumber",
  "estimated_cost_range": "$100-$300",
  "photo_ids": ["kitchen_sink_001.jpg"],
  "source_input_type": "Text",
  "confidence": 1.0,
  "needs_human_review": true,
  "missing_information": []
}
```

## What This Project Demonstrates

- Product decomposition
- Domain modeling with Pydantic
- Structured LLM outputs via SDK-enforced schemas (Anthropic tool use, OpenAI json_schema)
- Model-agnostic provider abstraction (swap between Anthropic and OpenAI via `.env`)
- Field-level prompt guidance with examples and negative examples
- Evaluation-first AI development with a two-track eval harness (enum exact match + LLM judge)
- Eval run logging with timestamped JSON records for tracking score changes over time
- Audio transcription via OpenAI Whisper
- Image analysis via vision LLM (Anthropic or OpenAI, same provider abstraction)
- FastAPI REST API with auto-generated interactive docs
- Human-in-the-loop review design
- Pytest test suite

## Project Structure

```text
evidence-backed-home-inspection-observation-engine/
  app/
    __init__.py
    api.py                      # FastAPI app — POST /observations, /transcribe, /analyze-image
    schemas.py                  # Pydantic models and enums
    workflow_status.py          # Determines observation status from input
    load_sample_observations.py # Loads JSONL input data
    observation_factory.py      # Core LLM call and structured output logic
    llm_client.py               # Provider abstraction (Anthropic / OpenAI)
    prompts.py                  # System prompt and observation prompt builder
    field_guidance.py           # Per-field rules, criteria, examples, and negative examples
    expected_output.py          # Loads expected output ground truth for eval
    audio_transcription.py      # Audio file transcription via OpenAI Whisper
    image_analysis.py           # Image description via vision LLM (Anthropic or OpenAI)
  data/
    sample_observations.jsonl   # 15 sample inspector observations (14 complete, 1 incomplete)
    expected_outputs.jsonl      # Ground truth for eval scoring (enum + free-text fields)
  runs/
    *.json                      # Timestamped eval run records
  docs/
    product_brief.md
    workflow.md
    schema_notes.md
  tests/
    __init__.py
    test_observation_input.py
    test_workflow_status.py
    test_load_sample_observations.py
    test_observation_factory.py
    test_audio_transcription.py
    test_image_analysis.py
  eval.py                       # Scores LLM output against expected outputs
  run_demo.py                   # Runs all sample observations and prints results
  requirements.txt
  README.md
```

## Setup

From this project folder, create and activate a virtual environment, then install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in this folder (never committed):

```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

Set `LLM_PROVIDER` to `anthropic` or `openai` to switch providers for the observation factory. The eval LLM judge and audio transcription always use OpenAI.

## Running the Demo

Runs all sample observations through the factory and prints the structured output:

```bash
python run_demo.py
```

## Running the API

Start the server:

```bash
uvicorn app.api:app --reload
```

Open the interactive docs at `http://127.0.0.1:8000/docs` to test endpoints in the browser.

### POST /observations

Accepts a typed description, optional audio transcript, and photo IDs. Returns a structured observation.

```json
{
  "text_description": "Active leak under kitchen sink, cabinet base is wet",
  "audio_transcript": null,
  "photo_ids": ["kitchen_sink_001.jpg"]
}
```

With `observation_id` as a query parameter.

### POST /transcribe

Accepts an audio file upload and returns the transcript as text. Use this to transcribe inspector audio before submitting to `/observations`.

```bash
curl -X POST "http://127.0.0.1:8000/transcribe" \
  -F "file=@inspector_note.mp3"
```

Returns:

```json
{ "transcript": "Active leak under the kitchen sink, the cabinet base is wet." }
```

Supported formats: mp3, mp4, m4a, wav, webm.

### POST /analyze-image

Accepts an image file upload and returns a plain-English description of what the vision LLM sees — visible defects, materials, condition. Use the same `LLM_PROVIDER` setting as the observation factory.

```bash
curl -X POST "http://127.0.0.1:8000/analyze-image" \
  -F "file=@photo.jpg"
```

Returns:

```json
{ "description": "The image shows a section of drywall near the base of a wall with visible water staining and bubbling paint, suggesting past or ongoing moisture intrusion." }
```

Supported formats: jpg, jpeg, png, gif, webp.

## Running the Eval

Scores LLM output against ground truth in `data/expected_outputs.jsonl`.

Full eval (enum exact match + LLM judge on free-text fields):

```bash
python eval.py "your change note here"
```

Enum-only eval (faster and cheaper — no LLM judge calls):

```bash
python eval.py "your change note here" --enum-only
```

Each run saves a timestamped JSON record to `runs/` capturing scores, per-field results, and the change note. Use this to track whether prompt or guidance changes improve scores.

Eval covers 5 enum fields (system, severity, safety_related, responsible_professional, estimated_cost_range) and 3 free-text fields via LLM judge (professional_report_description, plain_english_summary, recommended_action). Free-text fields are scored 1-10.

## Running Tests

```bash
pytest tests/ -v
```

16 tests covering input validation, workflow status, data loading, observation factory behavior, audio transcription, and image analysis. Both transcription and image analysis tests mock the LLM client — no API calls needed to run the test suite.

## Status

Core LLM pipeline complete. REST API live with three endpoints: observation generation, audio transcription, and image analysis. Two-track eval harness operational across 14 complete observations covering all home system and severity enum values. 16 passing tests.

## What's Next

The image analysis pipeline and the observation pipeline are currently separate. The logical next step is to wire them together: when an inspector submits an observation with photos, the system should automatically analyze those images and include the visual description in the LLM prompt alongside the text/audio input. Right now `photo_ids` are stored as strings but never analyzed.

After that, the remaining gap is the approval workflow — `Approved` and `Rejected` statuses are defined in the schema but are unreachable because there is no endpoint to transition a `Ready for Review` observation.
