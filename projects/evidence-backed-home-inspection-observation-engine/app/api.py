from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from sqlmodel import Session, select
import tempfile
import os
from app.schemas import ObservationInput, StructuredObservation, ObservationStatus
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


@app.get("/observations/{observation_id}", response_model=StructuredObservation)
def get_observation(observation_id: str, session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    return observation


@app.get("/observations", response_model=list[StructuredObservation])
def list_observations(session: Session = Depends(get_session)):
    observations = session.exec(select(StructuredObservation)).all()
    return observations
    

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


@app.post("/observations/{observation_id}/approve", response_model=StructuredObservation)
def approve_observation(observation_id: str, session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    if observation.status != ObservationStatus.READY_FOR_REVIEW:
        raise HTTPException(status_code=400, detail=f"Cannot approve an observation with status '{observation.status}'")
    observation.status = ObservationStatus.APPROVED
    observation.needs_human_review = False
    session.add(observation)
    session.commit()
    session.refresh(observation)
    return observation


@app.post("/observations/{observation_id}/reject", response_model=StructuredObservation)
def reject_observation(observation_id: str, session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    if observation.status != ObservationStatus.READY_FOR_REVIEW:
        raise HTTPException(status_code=400, detail=f"Cannot reject an observation with status '{observation.status}'")
    observation.status = ObservationStatus.REJECTED
    observation.needs_human_review = False
    session.add(observation)
    session.commit()
    session.refresh(observation)
    return observation