from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Form, Response
from typing import List, Optional
import traceback
import logging 
from datetime import datetime, timezone
from sqlmodel import Session, select
import time
import tempfile
import os
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import ObservationInput, StructuredObservation, ObservationStatus, Photo, Audio, RejectionReason, ObservationPatch, Inspector, RegisterRequest, LoginRequest, TokenResponse, InspectorOut, Inspection, InspectionCreate, InspectionOut, InspectorPatch, InspectionProfilePatch, InspectionDetailsPatch, NotInspectedObservation, NotInspectedPhoto
from app.weather import fetch_weather
from app.auth import hash_password, verify_password, create_access_token, get_current_inspector
from app.observation_factory import create_basic_structured_observation
from app.not_inspected_factory import classify_not_inspected
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


def _inspection_out(inspection: Inspection) -> dict:
    data = InspectionOut.model_validate(inspection).model_dump()
    data['has_front_of_house_photo'] = inspection.front_of_house_photo_data is not None
    return data


def _inspector_out(inspector: Inspector) -> dict:
    return {
        "id": inspector.id,
        "email": inspector.email,
        "name": inspector.name,
        "company_name": inspector.company_name,
        "company_address": inspector.company_address,
        "company_phone": inspector.company_phone,
        "license_number": inspector.license_number,
        "website": inspector.website,
        "standards_complied_with": inspector.standards_complied_with,
        "has_headshot": inspector.headshot_data is not None,
        "has_logo": inspector.logo_data is not None,
    }


@app.post("/observations", response_model=StructuredObservation)
def create_observation(
    observation_id: str,
    inspection_id: Optional[int] = Form(default=None),
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
        result = create_basic_structured_observation(
            observation_id, observation_input,
            session=session, inspection_id=inspection_id
        )
        t_llm_ms = round((time.perf_counter() - t_llm_start) * 1000)
        result.text_description = text_description
        result.inspection_id = inspection_id
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
        logging.error("Observation creation failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to process observation. Please try again.")
    finally:
        for path in tmp_paths:
            os.unlink(path)
    

@app.post("/observations/raw", response_model=StructuredObservation)
def create_raw_observation(
    observation_id: str,
    inspection_id: Optional[int] = Form(default=None),
    text_description: Optional[str] = Form(default=None),
    audio_transcript: Optional[str] = Form(default=None),
    audio_duration: Optional[float] = Form(default=None),
    audio_waveform: Optional[str] = Form(default=None),
    photos: List[UploadFile] = File(default=[]),
    audio_file: Optional[UploadFile] = File(default=None),
    session: Session = Depends(get_session)):
    try:
        photo_rows = []
        for photo in photos:
            photo_bytes = photo.file.read()
            photo_rows.append(Photo(
                observation_id=observation_id,
                filename=photo.filename,
                content_type=photo.content_type or "image/jpeg",
                data=photo_bytes
            ))

        for photo_row in photo_rows:
            session.add(photo_row)
        session.flush()

        audio_row = None
        if audio_file:
            audio_bytes = audio_file.file.read()
            audio_row = Audio(
                observation_id=observation_id,
                filename=audio_file.filename or "recording.webm",
                content_type=audio_file.content_type or "audio/webm",
                data=audio_bytes,
                duration_seconds=audio_duration,
                waveform_bars=audio_waveform
            )
            session.add(audio_row)
            session.flush()
        
        observation = StructuredObservation(
            observation_id=observation_id,
            inspection_id=inspection_id,
            status=ObservationStatus.RAW,
            text_description=text_description,
            audio_transcript=audio_transcript,
            photo_ids=[p.id for p in photo_rows],
            created_at=datetime.now(timezone.utc)
        )

        session.add(observation)
        session.commit()
        session.refresh(observation)
        return observation
    except Exception as e:
        logging.error("Raw observation creation failed: \n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to save observation. Please try again.")


@app.post("/observations/not-inspected", response_model=NotInspectedObservation)
def create_not_inspected_observation(
    not_inspected_id: str,
    inspection_id: Optional[int] = Form(default=None),
    text_description: Optional[str] = Form(default=None),
    photos: List[UploadFile] = File(default=[]),
    audio_file: Optional[UploadFile] = File(default=None),
    session: Session = Depends(get_session)):
    """
    Accepts a not-inspected observation (text + optional audio + optional photos),
    runs a lightweight LLM classification, and returns the persisted record.
    Audio is transcribed inline via Whisper before the classification call.
    """
    tmp_paths = []
    try:
        # Save photos
        photo_rows = []
        for photo in photos:
            photo_bytes = photo.file.read()
            photo_rows.append(NotInspectedPhoto(
                not_inspected_id=not_inspected_id,
                filename=photo.filename,
                content_type=photo.content_type or "image/jpeg",
                data=photo_bytes,
            ))
        for photo_row in photo_rows:
            session.add(photo_row)
        session.flush()

        # Transcribe audio if provided
        audio_transcript: Optional[str] = None
        if audio_file:
            audio_bytes = audio_file.file.read()
            suffix = os.path.splitext(audio_file.filename or "recording.webm")[1] or ".webm"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(audio_bytes)
                tmp_paths.append(tmp.name)
            audio_transcript = transcribe_audio(tmp_paths[-1])

        photo_ids = [p.id for p in photo_rows]

        observation = classify_not_inspected(
            not_inspected_id=not_inspected_id,
            inspection_id=inspection_id,
            text_description=text_description,
            audio_transcript=audio_transcript,
            photo_ids=photo_ids,
        )

        session.add(observation)
        session.commit()
        session.refresh(observation)
        return observation

    except Exception as e:
        logging.error("Not-inspected observation failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to save not-inspected observation. Please try again.")
    finally:
        for path in tmp_paths:
            if os.path.exists(path):
                os.unlink(path)


@app.get("/not-inspected/{not_inspected_id}", response_model=NotInspectedObservation)
def get_not_inspected_observation(not_inspected_id: str, session: Session = Depends(get_session)):
    obs = session.get(NotInspectedObservation, not_inspected_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Not-inspected observation not found")
    return obs


@app.get("/inspections/{inspection_id}/not-inspected", response_model=List[NotInspectedObservation])
def list_not_inspected_observations(inspection_id: int, session: Session = Depends(get_session)):
    obs = session.exec(
        select(NotInspectedObservation).where(NotInspectedObservation.inspection_id == inspection_id)
    ).all()
    return obs


@app.get("/observations/{observation_id}", response_model=StructuredObservation)
def get_observation(observation_id: str, session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    return observation


@app.get("/observations", response_model=List[StructuredObservation])
def list_observations(status: Optional[ObservationStatus] = None, inspection_id: Optional[int] = None, limit: int = 100, offset: int = 0, session: Session = Depends(get_session)):
    query = select(StructuredObservation)
    if status is not None:
        query = query.where(StructuredObservation.status == status)
    if inspection_id is not None:
        query = query.where(StructuredObservation.inspection_id == inspection_id)
    observations = session.exec(query.offset(offset).limit(limit)).all()
    return observations


@app.get("/observations/{observation_id}/photos/{photo_id}")
def get_observation_photo(observation_id: str, photo_id: int, session: Session = Depends(get_session)):
    photo = session.get(Photo, photo_id)
    if not photo or photo.observation_id != observation_id:
        raise HTTPException(status_code=404, detail="Photo not found")
    return Response(content=photo.data, media_type=photo.content_type)


@app.get("/observations/{observation_id}/audio")
def get_observation_audio(observation_id: str, session: Session = Depends(get_session)):
    audio = session.exec(select(Audio).where(Audio.observation_id == observation_id)).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    return Response(
        content=audio.data,
        media_type=audio.content_type,
        headers={"Content-Disposition": f"inline; filename=\"{audio.filename}\""}
    )


@app.post("/observations/{observation_id}/process", response_model=StructuredObservation)
def process_observation(observation_id: str, session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    if observation.status != ObservationStatus.RAW:
        raise HTTPException(status_code=400, detail="Only Raw observations can be processed")

    tmp_paths = []
    try:
        t_total_start = time.perf_counter()

        photo_ids = observation.photo_ids or []
        photo_rows = [session.get(Photo, pid) for pid in photo_ids]
        photo_rows = [p for p in photo_rows if p]

        image_descriptions = []
        t_image_start = time.perf_counter()
        for photo in photo_rows:
            suffix = os.path.splitext(photo.filename)[1] or ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(photo.data)
                tmp_paths.append(tmp.name)
            image_descriptions.append(analyze_image(tmp_paths[-1]))
        t_image_ms = round((time.perf_counter() - t_image_start) * 1000)

        observation_input = ObservationInput(
            text_description=observation.text_description,
            audio_transcript=observation.audio_transcript,
            photo_ids=[p.filename for p in photo_rows],
            image_descriptions=image_descriptions
        )

        t_llm_start = time.perf_counter()
        result = create_basic_structured_observation(
            observation_id, observation_input,
            session=session, inspection_id=observation.inspection_id
        )
        t_llm_ms = round((time.perf_counter() - t_llm_start) * 1000)

        observation.title = result.title
        observation.room_or_area = result.room_or_area
        observation.system = result.system
        observation.component = result.component
        observation.defect_type = result.defect_type
        observation.severity = result.severity
        observation.safety_related = result.safety_related
        observation.professional_report_description = result.professional_report_description
        observation.plain_english_summary = result.plain_english_summary
        observation.recommended_action = result.recommended_action
        observation.responsible_professional = result.responsible_professional
        observation.estimated_cost_range = result.estimated_cost_range
        observation.source_input_type = result.source_input_type
        observation.confidence = result.confidence
        observation.needs_human_review = result.needs_human_review
        observation.missing_information = result.missing_information
        observation.llm_usage = result.llm_usage
        observation.image_descriptions = image_descriptions
        observation.status = result.status
        observation.approaching_end_of_life = result.approaching_end_of_life
        observation.eol_source = result.eol_source
        observation.eol_reasoning = result.eol_reasoning
        observation.timings_ms = {
            "image_analysis_ms": t_image_ms,
            "llm_call_ms": t_llm_ms,
            "total_ms": round((time.perf_counter() - t_total_start) * 1000)
        }

        session.add(observation)
        session.commit()
        session.refresh(observation)
        return observation

    except Exception as e:
        logging.error("Observation processing failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to process observation. Please try again.")
    finally:
        for path in tmp_paths:
            if os.path.exists(path):
                os.unlink(path)


@app.post("/inspections/{inspection_id}/process-queue")
def process_queue(inspection_id: int, session: Session = Depends(get_session)):
    raw_observations = session.exec(
        select(StructuredObservation)
        .where(StructuredObservation.inspection_id == inspection_id)
        .where(StructuredObservation.status == ObservationStatus.RAW)
    ).all()

    results = []
    for obs in raw_observations:
        try:
            result = process_observation(obs.observation_id, session)
            results.append({"observation_id": obs.observation_id, "status": result.status, "success": True})
        except HTTPException as e:
            results.append({"observation_id": obs.observation_id, "status": "error", "success": False, "detail": e.detail})

    return {"processed": len(results), "results": results}

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
        logging.error("Transcription failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to transcribe audio. Please try again.")
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
        logging.error("Image analysis failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to analyze image. Please try again.")
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


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    inspector = session.exec(select(Inspector).where(Inspector.email == payload.email)).first()
    if not inspector or not verify_password(payload.password, inspector.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(str(inspector.id)))


@app.get("/auth/me", response_model=InspectorOut)
def get_me(inspector: Inspector = Depends(get_current_inspector)):
    return _inspector_out(inspector)
    
@app.post("/inspections", response_model=InspectionOut, status_code=201)
def create_inspection(
    payload: InspectionCreate,
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
    ):
    now = datetime.now(timezone.utc)
    data = payload.model_dump()
    if not data.get('inspection_date'):
        data['inspection_date'] = now
    inspection = Inspection(
        **data,
        inspector_id=inspector.id,
        created_at=now,
    )
    session.add(inspection)
    session.commit()
    session.refresh(inspection)
    return _inspection_out(inspection)


@app.post("/inspections/{inspection_id}/fetch-weather", response_model=InspectionOut)
def refetch_weather(
    inspection_id: int,
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
):
    inspection = session.get(Inspection, inspection_id)
    if not inspection or inspection.inspector_id != inspector.id:
        raise HTTPException(status_code=404, detail="Inspection not found")
    weather = fetch_weather(inspection.address, inspection.inspection_date or datetime.now(timezone.utc))
    if weather:
        inspection.weather_data = weather
        session.add(inspection)
        session.commit()
        session.refresh(inspection)
    return _inspection_out(inspection)


@app.get("/inspections", response_model=List[InspectionOut])
def list_inspections(
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
    ):
    inspections = session.exec(
        select(Inspection).where(Inspection.inspector_id == inspector.id)
    ).all()
    return [_inspection_out(i) for i in inspections]


@app.get("/inspections/{inspection_id}", response_model=InspectionOut)
def get_inspection(
    inspection_id: int,
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
    ):
    inspection = session.get(Inspection, inspection_id)
    if not inspection or inspection.inspector_id != inspector.id:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return _inspection_out(inspection)


@app.patch("/inspections/{inspection_id}/profile", response_model=InspectionOut)
def patch_inspection_profile(
    inspection_id: int,
    patch: InspectionProfilePatch,
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
):
    """Update system descriptor fields for an inspection. All touched fields are marked 'confirmed'."""
    inspection = session.get(Inspection, inspection_id)
    if not inspection or inspection.inspector_id != inspector.id:
        raise HTTPException(status_code=404, detail="Inspection not found")
    sources = dict(inspection.system_profile_sources or {})
    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(inspection, field, value)
        if value is not None:
            sources[field] = "confirmed"
        else:
            sources.pop(field, None)  # declined — remove from sources
    inspection.system_profile_sources = sources
    session.add(inspection)
    session.commit()
    session.refresh(inspection)
    return _inspection_out(inspection)


@app.patch("/inspections/{inspection_id}/details", response_model=InspectionOut)
def patch_inspection_details(
    inspection_id: int,
    patch: InspectionDetailsPatch,
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
):
    inspection = session.get(Inspection, inspection_id)
    if not inspection or inspection.inspector_id != inspector.id:
        raise HTTPException(status_code=404, detail="Inspection not found")
    updates = patch.model_dump(exclude_unset=True)
    if "inspection_date" in updates or "address" in updates:
        updates["weather_data"] = None  # stale — frontend will re-fetch
    for field, value in updates.items():
        setattr(inspection, field, value)
    session.add(inspection)
    session.commit()
    session.refresh(inspection)
    return _inspection_out(inspection)


@app.post("/inspections/{inspection_id}/front-of-house-photo", status_code=204)
def upload_front_of_house_photo(
    inspection_id: int,
    file: UploadFile = File(...),
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
):
    inspection = session.get(Inspection, inspection_id)
    if not inspection or inspection.inspector_id != inspector.id:
        raise HTTPException(status_code=404, detail="Inspection not found")
    inspection.front_of_house_photo_data = file.file.read()
    inspection.front_of_house_photo_content_type = file.content_type or "image/jpeg"
    session.add(inspection)
    session.commit()


@app.get("/inspections/{inspection_id}/front-of-house-photo")
def get_front_of_house_photo(
    inspection_id: int,
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
):
    inspection = session.get(Inspection, inspection_id)
    if not inspection or inspection.inspector_id != inspector.id:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if not inspection.front_of_house_photo_data:
        raise HTTPException(status_code=404, detail="No front of house photo uploaded")
    return Response(content=inspection.front_of_house_photo_data, media_type=inspection.front_of_house_photo_content_type or "image/jpeg")


@app.delete("/inspections/{inspection_id}", status_code=204)
def delete_inspection(
    inspection_id: int,
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
    ):
    inspection = session.get(Inspection, inspection_id)
    if not inspection or inspection.inspector_id != inspector.id:
        raise HTTPException(status_code=404, detail="Inspection not found")

    observations = session.exec(select(StructuredObservation).where(StructuredObservation.inspection_id == inspection_id)).all()
    for obs in observations:
        for photo in session.exec(select(Photo).where(Photo.observation_id == obs.observation_id)).all():
            session.delete(photo)
        for audio in session.exec(select(Audio).where(Audio.observation_id == obs.observation_id)).all():
            session.delete(audio)
        session.delete(obs)

    not_inspected = session.exec(select(NotInspectedObservation).where(NotInspectedObservation.inspection_id == inspection_id)).all()
    for ni in not_inspected:
        for photo in session.exec(select(NotInspectedPhoto).where(NotInspectedPhoto.not_inspected_id == ni.id)).all():
            session.delete(photo)
        session.delete(ni)

    session.delete(inspection)
    session.commit()

@app.post("/auth/register", response_model=InspectorOut, status_code=201)
def register(payload: RegisterRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(Inspector).where(Inspector.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    inspector = Inspector(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        created_at=datetime.now(timezone.utc),
    )
    session.add(inspector)
    session.commit()
    session.refresh(inspector)
    return _inspector_out(inspector)


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


@app.patch("/inspectors/me", response_model=InspectorOut)
def update_inspector(
    patch: InspectorPatch,
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
    ):
    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(inspector, field, value)
    session.add(inspector)
    session.commit()
    session.refresh(inspector)
    return _inspector_out(inspector)


@app.post("/inspectors/me/headshot", status_code=204)
def upload_headshot(
    file: UploadFile = File(...),
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
):
    inspector.headshot_data = file.file.read()
    inspector.headshot_content_type = file.content_type or "image/jpeg"
    session.add(inspector)
    session.commit()


@app.get("/inspectors/me/headshot")
def get_headshot(inspector: Inspector = Depends(get_current_inspector)):
    if not inspector.headshot_data:
        raise HTTPException(status_code=404, detail="No headshot uploaded")
    return Response(content=inspector.headshot_data, media_type=inspector.headshot_content_type or "image/jpeg")


@app.post("/inspectors/me/logo", status_code=204)
def upload_logo(
    file: UploadFile = File(...),
    inspector: Inspector = Depends(get_current_inspector),
    session: Session = Depends(get_session),
):
    inspector.logo_data = file.file.read()
    inspector.logo_content_type = file.content_type or "image/png"
    session.add(inspector)
    session.commit()


@app.get("/inspectors/me/logo")
def get_logo(inspector: Inspector = Depends(get_current_inspector)):
    if not inspector.logo_data:
        raise HTTPException(status_code=404, detail="No logo uploaded")
    return Response(content=inspector.logo_data, media_type=inspector.logo_content_type or "image/png")


@app.delete("/observations/{observation_id}", status_code=204)
def delete_observation(observation_id: str, session: Session = Depends(get_session)):
    observation = session.get(StructuredObservation, observation_id)
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found")
    photos = session.exec(select(Photo).where(Photo.observation_id == observation_id)).all()
    for photo in photos:
        session.delete(photo)
    audio_records = session.exec(select(Audio).where(Audio.observation_id == observation_id)).all()
    for audio in audio_records:
        session.delete(audio)
    session.delete(observation)
    session.commit()