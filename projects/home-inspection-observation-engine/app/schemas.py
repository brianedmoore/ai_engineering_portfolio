from enum import Enum
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON


class ObservationStatus(str, Enum):
    RAW = "Raw"
    INCOMPLETE = "Incomplete"
    READY_FOR_REVIEW = "Ready for Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    NEEDS_REVISION = "Needs Revision"


class EolSource(str, Enum):
    UNKNOWN = "unknown"       # No age data found — cannot assess
    INFERRED = "inferred"     # LLM detected age evidence; rules engine assessed
    CONFIRMED = "confirmed"   # Inspector explicitly confirmed during review


class RejectionReason(str, Enum):
    BAD_PHOTO = "bad_photo"
    BAD_AUDIO = "bad_audio"
    BAD_TEXT = "bad_text"
    DUPLICATE = "duplicate"
    OTHER = "other"


class NotInspectedReason(str, Enum):
    # Access — inspector could not physically reach the component
    ACCESS_BLOCKED = "access_blocked"             # Blocked by furnishings, storage, or debris
    ACCESS_LOCKED = "access_locked"               # Locked; owner denied or was unavailable
    # Concealment — component exists but is not visible
    CONCEALED_MATERIALS = "concealed_materials"   # Covered by drywall, insulation, flooring, etc.
    CONCEALED_PROPERTY = "concealed_property"     # Covered by personal belongings
    # Safety — hazardous to attempt inspection
    SAFETY_ELECTRICAL = "safety_electrical"       # Active electrical hazard
    SAFETY_STRUCTURAL = "safety_structural"       # Structural instability risk
    SAFETY_ENVIRONMENTAL = "safety_environmental" # Suspected asbestos, mold, or other hazard
    # Conditions — cannot test meaningfully under current conditions
    CONDITIONS_SEASONAL = "conditions_seasonal"   # System off-season (AC in winter, etc.)
    CONDITIONS_INOPERABLE = "conditions_inoperable" # Utility off or system non-functional
    # Scope — outside the agreed inspection boundary
    SCOPE_EXCLUDED = "scope_excluded"             # Excluded by inspection agreement or contract
    SCOPE_SPECIALIST = "scope_specialist"         # Deferred to specialist (pool, septic, well, etc.)
    # Other
    DEMOLISHED = "demolished"                     # Component already demolished or removed

    
class Severity(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class SourceInputType(str, Enum):
    TEXT = "Text"
    AUDIO = "Audio"
    TEXT_AND_AUDIO = "Text and Audio"
    MISSING = "Missing"


class HomeSystem(str, Enum):
    ROOFING = "Roofing"
    EXTERIOR = "Exterior"
    STRUCTURE = "Structure"
    ELECTRICAL = "Electrical"
    PLUMBING = "Plumbing"
    HVAC = "HVAC"
    INTERIOR = "Interior"
    INSULATION_AND_VENTILATION = "Insulation and Ventilation"
    APPLIANCES = "Appliances"
    SITE_AND_GROUNDS = "Site and Grounds"
    GARAGE = "Garage"
    OTHER = "Other"


class ResponsibleProfessional(str, Enum):
    HOMEOWNER_DIY = "Homeowner/DIY"
    HANDYMAN = "Handyman"
    PLUMBER = "Plumber"
    ELECTRICIAN = "Electrician"
    HVAC_TECHNICIAN = "HVAC Technician"
    ROOFER = "Roofer"
    STRUCTURAL_ENGINEER = "Structural Engineer"
    FOUNDATION_CONTRACTOR = "Foundation Contractor"
    GENERAL_CONTRACTOR = "General Contractor"
    APPLIANCE_TECHNICIAN = "Appliance Technician"
    PEST_CONTROL = "Pest Control Professional"
    MOLD_WATER_MITIGATION = "Mold/Water Mitigation Professional"
    QUALIFIED_SPECIALIST = "Qualified Specialist"
    FURTHER_EVALUATION = "Further Evaluation Recommended"


class EstimatedCostRange(str, Enum):
    ZERO_TO_100 = "$0-$100"
    ONE_HUNDRED_TO_300 = "$100-$300"
    THREE_HUNDRED_TO_750 = "$300-$750"
    SEVEN_FIFTY_TO_2500 = "$750-$2,500"
    OVER_2500 = "$2,500+"
    UNKNOWN = "Unknown"


class ObservationInput(BaseModel):
    text_description: Optional[str] = Field(
        default=None,
        description="Typed field note provided by the inspector."
    )
    audio_transcript: Optional[str] = Field(
        default=None,
        description="Transcript from inspector audio narration."
    )
    photo_ids: List[str] = Field(
        default_factory=list,
        description="One or more photo references used as evidence for the observation."
    )
    image_descriptions: List[str] = Field(
        default_factory=list,
        description="One or more photo descriptions.")
    
    @property
    def is_complete(self) -> bool:
        has_photo = len(self.photo_ids) > 0
        has_text = bool(self.text_description and self.text_description.strip())
        has_audio = bool(self.audio_transcript and self.audio_transcript.strip())

        return has_photo and (has_text or has_audio)
    
    @property
    def source_input_type(self) -> SourceInputType:
        has_text = bool(self.text_description and self.text_description.strip())
        has_audio = bool(self.audio_transcript and self.audio_transcript.strip())

        if has_text and has_audio:
            return SourceInputType.TEXT_AND_AUDIO
        if has_text:
            return SourceInputType.TEXT
        if has_audio:
            return SourceInputType.AUDIO
        return SourceInputType.MISSING
    
    @property
    def missing_information(self) -> List[str]:
        missing = []

        if len(self.photo_ids) == 0:
            missing.append("At least one photo is required.")

        has_text = bool(self.text_description and self.text_description.strip())
        has_audio = bool(self.audio_transcript and self.audio_transcript.strip())

        if not has_text and not has_audio:
            missing.append("A typed description or audio transcript is required.")

        return missing


class Photo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    observation_id: str
    filename: str
    content_type: str
    data: bytes


class Audio(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    observation_id: str
    filename: str
    content_type: str
    data: bytes
    duration_seconds: Optional[float] = None
    waveform_bars: Optional[str] = None


class NotInspectedPhoto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    not_inspected_id: str
    filename: str
    content_type: str
    data: bytes


class NotInspectedObservation(SQLModel, table=True):
    id: str = Field(primary_key=True)
    inspection_id: Optional[int] = Field(default=None, foreign_key="inspection.id")
    # Where and what
    system: Optional[HomeSystem] = None
    room_or_area: Optional[str] = None
    component: Optional[str] = None
    # Classification — None until the LLM call runs
    reason: Optional[NotInspectedReason] = None
    # Description — LLM blends inspector's raw input + reason category into one sentence
    description: Optional[str] = None
    # Raw inspector input
    text_description: Optional[str] = None
    audio_transcript: Optional[str] = None
    # Photo IDs reference NotInspectedPhoto rows (optional — photo not required here)
    photo_ids: Optional[List[int]] = Field(default=None, sa_column=Column(JSON))
    created_at: Optional[datetime] = None


class NotInspectedLLMOutput(BaseModel):
    """Fields the LLM returns for a not-inspected classification call."""
    reason: NotInspectedReason
    system: HomeSystem
    component: str
    room_or_area: str
    description: str  # One professional sentence blending what the inspector said + the reason


class LLMObservationOutput(BaseModel):
    """Fields the LLM classifies. Used to enforce structured output via SDK tool use / json_schema mode."""
    title: str
    room_or_area: str
    system: HomeSystem
    component: str
    defect_type: str
    severity: Severity
    safety_related: bool
    professional_report_description: str
    plain_english_summary: str
    recommended_action: str
    responsible_professional: ResponsibleProfessional
    estimated_cost_range: EstimatedCostRange
    confidence: float = Field(ge=0.0, le=1.0)


class StructuredObservation(SQLModel, table=True):
    observation_id: str = Field(primary_key=True)
    inspection_id: Optional[int] = Field(default=None, foreign_key="inspection.id")
    status: ObservationStatus
    title: Optional[str] = None
    room_or_area: Optional[str] = None
    system: Optional[HomeSystem] = None
    component: Optional[str] = None
    defect_type: Optional[str] = None
    severity: Optional[Severity] = None
    safety_related: Optional[bool] = None
    professional_report_description: Optional[str] = None
    plain_english_summary: Optional[str] = None
    recommended_action: Optional[str] = None
    responsible_professional: Optional[ResponsibleProfessional] = None
    estimated_cost_range: Optional[EstimatedCostRange] = None
    photo_ids: Optional[List[int]] = Field(default=None, sa_column=Column(JSON))
    image_descriptions: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    source_input_type: Optional[SourceInputType] = None
    confidence: float = Field(default=0.0)
    needs_human_review: bool = True
    missing_information: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    text_description: Optional[str] = None
    audio_transcript: Optional[str] = None
    created_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[RejectionReason] = None
    rejection_notes: Optional[str] = None
    llm_usage: Optional[List[dict]] = Field(default=None, sa_column=Column(JSON))
    timings_ms: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # End-of-life assessment
    approaching_end_of_life: Optional[bool] = None
    eol_source: Optional[EolSource] = None
    eol_reasoning: Optional[str] = None
    

class ObservationPatch(SQLModel):
    title: Optional[str] = None
    room_or_area: Optional[str] = None
    system: Optional[HomeSystem] = None
    component: Optional[str] = None
    defect_type: Optional[str] = None
    severity: Optional[Severity] = None
    safety_related: Optional[bool] = None
    professional_report_description: Optional[str] = None
    plain_english_summary: Optional[str] = None
    recommended_action: Optional[str] = None
    responsible_professional: Optional[ResponsibleProfessional] = None
    estimated_cost_range: Optional[EstimatedCostRange] = None
    approaching_end_of_life: Optional[bool] = None
    eol_source: Optional[EolSource] = None
    eol_reasoning: Optional[str] = None


class Inspector(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    name: Optional[str] = None
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    license_number: Optional[str] = None
    created_at: Optional[datetime] = None


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class InspectorOut(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    license_number: Optional[str] = None

    model_config = {"from_attributes": True}


class Inspection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    inspector_id: int = Field(foreign_key="inspector.id")
    address: str
    client_name: Optional[str] = None
    property_type: Optional[str] = None
    inspection_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    # System descriptors — flat columns, one per field in system_descriptors.SYSTEM_DESCRIPTORS.
    # Add new fields in system_descriptors.py; then add the matching column here.
    # Roof
    roof_material: Optional[str] = None
    roof_estimated_age_years: Optional[float] = None
    roof_layers: Optional[str] = None
    # HVAC
    hvac_system_type: Optional[str] = None
    hvac_fuel_type: Optional[str] = None
    hvac_estimated_age_years: Optional[float] = None
    hvac_filter_condition: Optional[str] = None
    # Water heater
    water_heater_fuel_type: Optional[str] = None
    water_heater_estimated_age_years: Optional[float] = None
    water_heater_capacity_gallons: Optional[float] = None
    # Electrical
    electrical_panel_amperage: Optional[str] = None
    electrical_panel_manufacturer: Optional[str] = None
    electrical_wiring_type: Optional[str] = None
    electrical_gfci_present: Optional[bool] = None
    # Foundation
    foundation_type: Optional[str] = None
    foundation_material: Optional[str] = None
    # Plumbing
    plumbing_supply_material: Optional[str] = None
    plumbing_drain_material: Optional[str] = None
    plumbing_water_pressure_psi: Optional[float] = None
    # Exterior
    exterior_siding_material: Optional[str] = None
    exterior_driveway_material: Optional[str] = None
    # Tracks whether each field was "inferred" (LLM) or "confirmed" (inspector).
    # {"hvac_system_type": "inferred", "roof_material": "confirmed", ...}
    system_profile_sources: Optional[dict] = Field(default=None, sa_column=Column(JSON))

class InspectionCreate(BaseModel):
    address: str
    client_name: Optional[str] = None
    property_type: Optional[str] = None
    inspection_date: Optional[datetime] = None
    notes: Optional[str] = None


class InspectionOut(BaseModel):
    id: int
    inspector_id: int
    address: str
    client_name: Optional[str] = None
    property_type: Optional[str] = None
    inspection_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    # System descriptors
    roof_material: Optional[str] = None
    roof_estimated_age_years: Optional[float] = None
    roof_layers: Optional[str] = None
    hvac_system_type: Optional[str] = None
    hvac_fuel_type: Optional[str] = None
    hvac_estimated_age_years: Optional[float] = None
    hvac_filter_condition: Optional[str] = None
    water_heater_fuel_type: Optional[str] = None
    water_heater_estimated_age_years: Optional[float] = None
    water_heater_capacity_gallons: Optional[float] = None
    electrical_panel_amperage: Optional[str] = None
    electrical_panel_manufacturer: Optional[str] = None
    electrical_wiring_type: Optional[str] = None
    electrical_gfci_present: Optional[bool] = None
    foundation_type: Optional[str] = None
    foundation_material: Optional[str] = None
    plumbing_supply_material: Optional[str] = None
    plumbing_drain_material: Optional[str] = None
    plumbing_water_pressure_psi: Optional[float] = None
    exterior_siding_material: Optional[str] = None
    exterior_driveway_material: Optional[str] = None
    system_profile_sources: Optional[dict] = None

    model_config = {"from_attributes": True}


class InspectorPatch(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    license_number: Optional[str] = None