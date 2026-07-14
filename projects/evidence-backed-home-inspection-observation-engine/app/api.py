from fastapi import FastAPI, HTTPException, UploadFile, File
import tempfile
import os
from app.schemas import ObservationInput, StructuredObservation
from app.observation_factory import create_basic_structured_observation
from app.audio_transcription import transcribe_audio

app = FastAPI(
    title="Home Inspection Observation Engine",
    description="Accepts inspector field notes and returns a structured, AI-generated observation.",
    version="0.1.0"
)


@app.post("/observations", response_model=StructuredObservation)
def create_observation(observation_id: str, observation_input: ObservationInput):
    try:
        return create_basic_structured_observation(observation_id, observation_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/transcribe")
def transcribe(file: UploadFile = File(...)):
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file.file.read())
            tmp_path = tmp.name
        transcript = transcribe_audio(tmp_path)
        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)