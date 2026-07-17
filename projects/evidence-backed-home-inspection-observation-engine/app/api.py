from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from sqlmodel import Session
import tempfile
import os
from app.schemas import ObservationInput, StructuredObservation
from app.observation_factory import create_basic_structured_observation
from app.audio_transcription import transcribe_audio
from app.image_analysis import analyze_image
from app.database import create_db_and_tables, get_session

app = FastAPI(
    title="Home Inspection Observation Engine",
    description="Accepts inspector field notes and returns a structured, AI-generated observation.",
    version="0.1.0"
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.post("/observations", response_model=StructuredObservation)
def create_observation(observation_id: str, 
                       observation_input: ObservationInput,
                       session: Session = Depends(get_session)):
    try:
        result = create_basic_structured_observation(observation_id, observation_input)
        session.add(result)
        session.commit()
        session.refresh(result)
        return result
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


@app.post("/analyze-image")
def analyze_image_endpoint(file: UploadFile = File(...)):
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file.file.read())
            tmp_path = tmp.name
        description = analyze_image(tmp_path)
        return {"description": description}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)