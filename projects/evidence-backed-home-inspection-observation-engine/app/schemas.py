from enum import Enum


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
