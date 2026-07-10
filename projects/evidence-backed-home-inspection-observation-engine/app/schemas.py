from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ObservationStatus(str, Enum):
    INCOMPLETE = "Incomplete"
    READY_FOR_REVIEW = "Ready for Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"


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
    
class StructuredObservation(BaseModel):
    observation_id: str
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
    photo_ids: List[str] = Field(default_factory=list)
    source_input_type: Optional[SourceInputType] = None
    confidence: float = Field(default=0.0, ge=0 ,le=1)
    needs_human_review: bool = True
    missing_information: List[str] = Field(default_factory=list)