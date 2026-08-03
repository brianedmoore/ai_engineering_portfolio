from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Form, Response
from typing import List, Optional
from datetime import datetime, timezone
from sqlmodel import Session, select
import time
import tempfile
import os
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import ObservationInput, StructuredObservation, ObservationStatus, Photo, RejectionReason, ObservationPatch
from app.observation_factory import create_basic_structured_observation
from app.audio_transcription import transcribe_audio
from app.image_analysis import analyze_image
from app.database import create_db_and_tables, get_session

app = FastAPI(
    title="Home Inspection Observation Engine",
    description="Accepts inspector field notes and returns a structured, AI-generated observation.",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.post("/observations", response_model=StructuredObservation)
def create_observation(
    observation_id: str, 
    text_description: Optional[str] = Form(default=None),
    audio_transcript: Optional[str] = Form(default=None),
    photos: List[UploadFile] = File(default=[]),
    session: Session = Depends(get_session)):
    tmp_paths = []
    try:
        t_total_start = time.perf_counter()
        image_descriptions = []
        photo_rows = []

        t_image_start = time.perf_counter()
        for photo in photos:
            photo_bytes = photo.file.read()
            suffix = os.path.splitext(photo.filename)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(photo_bytes)
                tmp_paths.append(tmp.name)
            image_descriptions.append(analyze_image(tmp_paths[-1]))
            photo_rows.append(Photo(
                observation_id=observation_id,
                filename=photo.filename,
                content_type=photo.content_type or "image/jpeg",
                data=photo_bytes
            ))
        t_image_ms = round((time.perf_counter() - t_image_start) * 1000)
        
        observation_input = ObservationInput(
            text_description=text_description,
            audio_transcript=audio_transcript,
            photo_ids=[p.filename for p in photo_rows],
            image_descriptions=image_descriptions
        )

        t_llm_start = time.perf_counter()
        result = create_basic_structured_observation(observation_id, observation_input)
        t_llm_ms = round((time.perf_counter() - t_llm_start) * 1000)
        result.text_description = text_description
        result.audio_transcript = audio_transcript
        result.created_at = datetime.now(timezone.utc)
        result.timings_ms = {
            "image_analysis_ms": t_image_ms,
            "llm_call_ms": t_llm_ms,
            "total_ms": round((time.perf_counter() - t_total_start) * 1000)
        }

        for photo_row in photo_rows:
            session.add(photo_row)
        session.flush()

        result.photo_ids = [photo_row.id for photo_row in photo_rows]
        session.add(result)
        session.commit()
        session.refresh(result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for path in tmp_paths:
            os.unlink(path)
    

@app.get("/observations/{observation_id}", response_model=StructuredObservation)
def get_observation(observation_id: str, session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    return observation


@app.get("/observations", response_model=List[StructuredObservation])
def list_observations(status: Optional[ObservationStatus] = None, limit: int = 100, offset: int = 0, session: Session = Depends(get_session)):
    query = select(StructuredObservation)
    if status is not None:
        query = query.where(StructuredObservation.status == status)
    observations = session.exec(query.offset(offset).limit(limit)).all()
    return observations


@app.get("/observations/{observation_id}/photos/{photo_id}")
def get_observation_photo(observation_id: str, photo_id: int, session: Session = Depends(get_session)):
    photo = session.get(Photo, photo_id)
    if not photo or photo.observation_id != observation_id:
        raise HTTPException(status_code=404, detail="Photo not found")
    return Response(content=photo.data, media_type=photo.content_type)


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
    observation.reviewed_at = datetime.now(timezone.utc)

    session.add(observation)
    session.commit()
    session.refresh(observation)
    return observation


@app.post("/observations/{observation_id}/reject", response_model=StructuredObservation)
def reject_observation(
    observation_id: str,
    reason: RejectionReason,
    notes: Optional[str] = None,
    session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    if observation.status != ObservationStatus.READY_FOR_REVIEW:
        raise HTTPException(status_code=400, detail=f"Cannot reject an observation with status '{observation.status}'")
    if reason == RejectionReason.OTHER and not notes:
        raise HTTPException(status_code=422, detail="notes is required when reason is 'other'")
    observation.status = ObservationStatus.REJECTED
    observation.needs_human_review = False
    observation.reviewed_at = datetime.now(timezone.utc)
    observation.rejection_reason = reason
    observation.rejection_notes = notes

    session.add(observation)
    session.commit()
    session.refresh(observation)
    return observation


@app.patch("/observations/{observation_id}", response_model=StructuredObservation)
def patch_observation(observation_id: str, patch: ObservationPatch, session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    if observation.status != ObservationStatus.READY_FOR_REVIEW:
        raise HTTPException(status_code=400, detail=f"Cannot edit observation with status '{observation.status}'")
    updates = patch.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(observation, field, value)
    observation.status = ObservationStatus.APPROVED
    observation.needs_human_review = False
    observation.reviewed_at = datetime.now(timezone.utc)
    session.add(observation)
    session.commit()
    session.refresh(observation)
    return observation

@app.delete("/observations/{observation_id}", status_code=204)
def delete_observation(observation_id: str, session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    photos = session.exec(select(Photo).where(Photo.observation_id == observation_id)).all()
    for photo in photos:
        session.delete(photo)
    session.delete(observation)
    session.commit()