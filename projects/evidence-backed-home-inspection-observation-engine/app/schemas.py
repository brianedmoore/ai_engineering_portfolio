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
    ZERO_TO_100 = "$0–$100"
    ONE_HUNDRED_TO_300 = "$100–$300"
    THREE_HUNDRED_TO_750 = "$300–$750"
    SEVEN_FIFTY_TO_2500 = "$750–$2,500"
    OVER_2500 = "$2,500+"
    UNKNOWN = "Unknown"
