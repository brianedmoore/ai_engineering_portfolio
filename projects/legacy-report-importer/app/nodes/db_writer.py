"""
Node 11: DB Writer

Writes the extracted data to the observation engine's SQLite database:
  - Creates or finds the Inspector record (from PII extraction)
  - Creates the Inspection record (header + system descriptors)
  - Creates one StructuredObservation per extracted finding
  - Creates NotInspectedObservation records

Uses the same SQLModel engine as the sibling project — same DB file.

All imported records get:
  - status = "Needs Revision" so the inspector reviews before anything is live
  - source_input_type = "Text" (original report text, not live audio/photo)
  - needs_human_review = True

Images from the PDF are stored as Photo records linked to observations.
"""

import base64
import uuid
from datetime import datetime, timezone

from sqlmodel import Session, select

from ..state import ImportState

# Imports from sibling project (sys.path set in config.py)
from app.database import engine
from app.schemas import (
    Inspector,
    Inspection,
    StructuredObservation,
    NotInspectedObservation,
    ObservationStatus,
    SourceInputType,
    HomeSystem,
    Severity,
    SubCategory,
    ResponsibleProfessional,
    EstimatedCostRange,
    NotInspectedReason,
    Photo,
)

IMPORT_INSPECTOR_EMAIL = "legacy_import@system.local"


def _get_or_create_import_inspector(session: Session, pii: dict) -> Inspector:
    """
    Find or create a placeholder inspector for imported reports.
    Each distinct inspector (by name) gets their own record.
    """
    inspector_name = pii.get("inspector_name", "Legacy Import")
    email = pii.get("inspector_email") or f"legacy_{inspector_name.lower().replace(' ', '_')}@import.local"

    existing = session.exec(select(Inspector).where(Inspector.email == email)).first()
    if existing:
        return existing

    inspector = Inspector(
        email=email,
        hashed_password="[legacy_import]",  # no login — import-only record
        name=inspector_name,
        company_name=pii.get("inspector_company"),
        company_phone=pii.get("inspector_phone"),
        license_number=pii.get("inspector_license"),
        created_at=datetime.now(timezone.utc),
    )
    session.add(inspector)
    session.flush()
    return inspector


def _coerce_enum(value: str | None, enum_class, fallback):
    if value is None:
        return fallback
    try:
        return enum_class(value)
    except ValueError:
        return fallback


def _write_inspection(session: Session, inspector_id: int, header: dict, pii: dict) -> Inspection:
    inspection = Inspection(
        inspector_id=inspector_id,
        address=header.get("address") or pii.get("property_address") or "[Unknown Address]",
        client_name=pii.get("client_name"),
        property_type=header.get("property_type"),
        notes=header.get("notes"),
        created_at=datetime.now(timezone.utc),
        # System descriptor fields
        roof_material=header.get("roof_material"),
        roof_estimated_age_years=header.get("roof_estimated_age_years"),
        roof_layers=header.get("roof_layers"),
        hvac_system_type=header.get("hvac_system_type"),
        hvac_fuel_type=header.get("hvac_fuel_type"),
        hvac_estimated_age_years=header.get("hvac_estimated_age_years"),
        hvac_filter_condition=header.get("hvac_filter_condition"),
        water_heater_fuel_type=header.get("water_heater_fuel_type"),
        water_heater_estimated_age_years=header.get("water_heater_estimated_age_years"),
        water_heater_capacity_gallons=header.get("water_heater_capacity_gallons"),
        electrical_panel_amperage=header.get("electrical_panel_amperage"),
        electrical_panel_manufacturer=header.get("electrical_panel_manufacturer"),
        electrical_wiring_type=header.get("electrical_wiring_type"),
        electrical_gfci_present=header.get("electrical_gfci_present"),
        foundation_type=header.get("foundation_type"),
        foundation_material=header.get("foundation_material"),
        plumbing_supply_material=header.get("plumbing_supply_material"),
        plumbing_drain_material=header.get("plumbing_drain_material"),
        plumbing_water_pressure_psi=header.get("plumbing_water_pressure_psi"),
        exterior_siding_material=header.get("exterior_siding_material"),
        exterior_driveway_material=header.get("exterior_driveway_material"),
        system_profile_sources={},  # all inferred from old report
    )
    session.add(inspection)
    session.flush()
    return inspection


def _store_image(session: Session, observation_id: str, img: dict) -> int | None:
    try:
        img_bytes = base64.b64decode(img["bytes_b64"])
        content_type = f"image/{img.get('ext', 'jpeg')}"
        photo = Photo(
            observation_id=observation_id,
            filename=f"legacy_import_p{img['page_num']}_i{img['index']}.{img.get('ext', 'jpg')}",
            content_type=content_type,
            data=img_bytes,
        )
        session.add(photo)
        session.flush()
        return photo.id
    except Exception:
        return None


def _write_observations(
    session: Session,
    inspection_id: int,
    observations: list[dict],
    images: list[dict],
) -> list[str]:
    obs_ids = []
    img_map = {img["index"]: img for img in images}

    for obs in observations:
        obs_id = str(uuid.uuid4())

        # Store matched photos
        photo_ids = []
        image_descriptions = []
        for img_idx in obs.get("image_indices", []):
            img = img_map.get(img_idx)
            if img and not img.get("skip"):
                photo_id = _store_image(session, obs_id, img)
                if photo_id:
                    photo_ids.append(photo_id)
                if img.get("description"):
                    image_descriptions.append(img["description"])

        record = StructuredObservation(
            observation_id=obs_id,
            inspection_id=inspection_id,
            status=ObservationStatus.NEEDS_REVISION,
            title=obs.get("title"),
            room_or_area=obs.get("room_or_area"),
            system=_coerce_enum(obs.get("system"), HomeSystem, HomeSystem.OTHER),
            component=obs.get("component"),
            defect_type=obs.get("defect_type"),
            severity=_coerce_enum(obs.get("severity"), Severity, Severity.ADVISORY),
            sub_category=_coerce_enum(obs.get("sub_category"), SubCategory, SubCategory.INFORMATIONAL),
            safety_related=obs.get("safety_related", False),
            professional_report_description=obs.get("professional_report_description"),
            plain_english_summary=obs.get("plain_english_summary"),
            recommended_action=obs.get("recommended_action"),
            responsible_professional=_coerce_enum(
                obs.get("responsible_professional"), ResponsibleProfessional, ResponsibleProfessional.FURTHER_EVALUATION
            ),
            estimated_cost_range=_coerce_enum(
                obs.get("estimated_cost_range"), EstimatedCostRange, EstimatedCostRange.UNKNOWN
            ),
            photo_ids=photo_ids if photo_ids else None,
            image_descriptions=image_descriptions if image_descriptions else None,
            source_input_type=SourceInputType.TEXT,
            confidence=obs.get("confidence", 0.5),
            needs_human_review=True,
            text_description=obs.get("professional_report_description"),
            created_at=datetime.now(timezone.utc),
        )
        session.add(record)
        obs_ids.append(obs_id)

    return obs_ids


def _write_not_inspected(session: Session, inspection_id: int, items: list[dict]) -> None:
    for item in items:
        record = NotInspectedObservation(
            id=str(uuid.uuid4()),
            inspection_id=inspection_id,
            system=_coerce_enum(item.get("system"), HomeSystem, HomeSystem.OTHER),
            room_or_area=item.get("room_or_area"),
            component=item.get("component"),
            reason=_coerce_enum(item.get("reason"), NotInspectedReason, NotInspectedReason.SCOPE_EXCLUDED),
            description=item.get("description"),
            text_description=item.get("description"),
            created_at=datetime.now(timezone.utc),
        )
        session.add(record)


def run(state: ImportState) -> dict:
    errors = list(state.get("errors", []))

    with Session(engine) as session:
        try:
            pii = state.get("extracted_pii", {})
            inspector = _get_or_create_import_inspector(session, pii)
            inspection = _write_inspection(session, inspector.id, state.get("inspection_header", {}), pii)
            obs_ids = _write_observations(session, inspection.id, state.get("observations", []), state.get("images", []))
            _write_not_inspected(session, inspection.id, state.get("not_inspected", []))
            session.commit()

            print(f"[db_writer] Wrote inspection id={inspection.id}, {len(obs_ids)} observations")
            return {
                "db_result": {
                    "inspection_id": inspection.id,
                    "observation_ids": obs_ids,
                    "observation_count": len(obs_ids),
                    "errors": [],
                },
                "errors": errors,
            }

        except Exception as e:
            session.rollback()
            errors.append(f"DB write failed: {e}")
            print(f"[db_writer] ERROR: {e}")
            return {"db_result": {"errors": [str(e)]}, "errors": errors}
