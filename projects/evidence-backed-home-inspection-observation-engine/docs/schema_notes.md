# Schema Notes

## Core Object

The core object in this project is a single evidence-backed inspection observation.

An observation represents one reportable issue, condition, defect, limitation, or notable finding identified by a home inspector.

## Required Inputs

A complete observation requires:

- At least one photo
- At least one typed description or audio transcript

If either requirement is missing, the observation is incomplete.

## Output Fields

### observation_id

Unique identifier for the observation.

Example: obs_001

### status

Current workflow state of the observation.

Allowed values:
- Incomplete
- Ready for Review
- Approved
- Rejected

### title

Short, professional heading for the observation.

Example: Active Leak Below Kitchen Sink

### room_or_area

Where the issue was observed.

Examples:
- Kitchen
- Bathroom
- Garage
- Attic
- Crawlspace
- Exterior
- Roof
- Basement
- Laundry Room

### system

The broad home system related to the observation.

Allowed values:
- Roofing
- Exterior
- Structure
- Electrical
- Plumbing
- HVAC
- Interior
- Insulation and Ventilation
- Appliances
- Site and Grounds
- Garage
- Other

### component

The specific item affected.

Examples:
- Sink Drain / P-Trap
- Siding / Trim
- Roof Covering
- Electrical Receptacle
- Deck Railing
- HVAC Filter
- Water Heater
- Foundation Wall

### defect_type

What is wrong with the component.

Examples:
- Active leak
- Damaged material
- Deterioration
- Missing safety protection
- Improper installation
- Moisture staining
- Loose component
- Further evaluation needed

### severity

Simple priority level.

Allowed values:
- Low
- Medium
- High

### safety_related

Whether the observation may involve occupant safety.

Allowed values:
- true
- false

### professional_report_description

Formal home inspection report language.

This should be factual, neutral, and recommendation-oriented.

### plain_english_summary

Simple homeowner-friendly explanation.

### recommended_action

What should happen next.

Examples:
- Monitor during normal maintenance.
- Repair or replace the damaged material.
- Evaluation by a qualified plumber is recommended.
- Correction by a licensed electrical contractor is recommended.

### responsible_professional

Who should address the issue.

Allowed values:
- Homeowner/DIY
- Handyman
- Plumber
- Electrician
- HVAC Technician
- Roofer
- Structural Engineer
- Foundation Contractor
- General Contractor
- Appliance Technician
- Pest Control Professional
- Mold/Water Mitigation Professional
- Qualified Specialist
- Further Evaluation Recommended

### estimated_cost_range

Rough cost bucket.

Allowed values:
- $0–$100
- $100–$300
- $300–$750
- $750–$2,500
- $2,500+
- Unknown

### photo_ids

List of photo references attached to the observation.

A complete observation must include at least one photo.

### source_input_type

Where the description came from.

Allowed values:
- Text
- Audio
- Text and Audio
- Missing

### confidence

Estimated confidence that the generated classification and report description are reasonable based on available input.

Range:
- 0.0 to 1.0

### needs_human_review

Whether the observation requires inspector review.

For Version 1, this should always be:
- true

### missing_information

List of missing requirements or important gaps.

Examples:
- At least one photo is required.
- A typed description or audio transcript is required.
- Location is unclear.
- Issue is ambiguous.
