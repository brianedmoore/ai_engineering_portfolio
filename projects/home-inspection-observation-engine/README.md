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
- Automatic photo analysis wired into the observation submission workflow
- SQLite persistence via SQLModel with full observation lifecycle (create, retrieve, approve, reject)
- FastAPI REST API with auto-generated interactive docs
- Human-in-the-loop review design with approve/reject endpoints
- Pytest test suite

## Project Structure

```text
evidence-backed-home-inspection-observation-engine/
  app/
    __init__.py
    api.py                      # FastAPI app — full REST API with observation CRUD and review workflow
    database.py                 # SQLite engine, session management, and table creation
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

Accepts multipart form data with an optional text description, optional audio transcript, and one or more photo file uploads. Automatically runs vision analysis on each photo and includes the image descriptions in the LLM prompt. Returns a structured observation saved to the database.

```bash
curl.exe -X POST "http://127.0.0.1:8000/observations?observation_id=obs_001" \
  -F "text_description=water stain on ceiling near light fixture, approximately 12 inches diameter" \
  -F "photos=@photo.jpg"
```

`observation_id` is a required query parameter. Photos are optional but recommended — a complete observation requires at least one photo and either a text description or audio transcript.

### GET /observations

Returns all saved observations.

### GET /observations/{observation_id}

Returns a single observation by ID, including stored image descriptions.

### POST /observations/{observation_id}/approve

Transitions a `Ready for Review` observation to `Approved` and sets `needs_human_review` to false.

### POST /observations/{observation_id}/reject

Transitions a `Ready for Review` observation to `Rejected` and sets `needs_human_review` to false.

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

## Running with Docker

Build the image:

```bash
docker build -t home-inspection-engine .
```

Run the server, passing your API keys as environment variables:

```bash
docker run -p 8000:8000 \
  -e LLM_PROVIDER=anthropic \
  -e ANTHROPIC_API_KEY=your_key_here \
  -e OPENAI_API_KEY=your_key_here \
  home-inspection-engine
```

Open the interactive docs at `http://localhost:8000/docs`.

By default, `observations.db` lives inside the container and is lost when the container stops. To persist data across restarts, mount a local file:

```bash
docker run -p 8000:8000 \
  -e LLM_PROVIDER=anthropic \
  -e ANTHROPIC_API_KEY=your_key_here \
  -e OPENAI_API_KEY=your_key_here \
  -v $(pwd)/observations.db:/app/observations.db \
  home-inspection-engine
```

## Viewing the Database

Observations are persisted to `observations.db` (SQLite) in the project folder. The file is created automatically on first server startup.

To inspect the data with a GUI, download [DB Browser for SQLite](https://sqlitebrowser.org/dl/) — free, open source, no setup required. Open the app, click **Open Database**, select `observations.db`, then go to the **Browse Data** tab and select the `structuredobservation` table.

To query it from the terminal without a GUI:

```bash
python -c "import sqlite3; conn = sqlite3.connect('observations.db'); rows = conn.execute('SELECT observation_id, status, title FROM structuredobservation').fetchall(); [print(r) for r in rows]; conn.close()"
```

**Note:** if you add new fields to `StructuredObservation`, delete `observations.db` and restart the server — SQLModel will recreate the table with the updated schema. Existing data will be lost.

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

Full end-to-end pipeline operational. Inspector submits a photo + field note via `POST /observations`, the server automatically analyzes the image via vision LLM, generates a structured observation, and persists everything to SQLite. Observations can be retrieved, listed, approved, and rejected via REST endpoints. Image descriptions are stored on the observation for full traceability. 16 passing tests.
