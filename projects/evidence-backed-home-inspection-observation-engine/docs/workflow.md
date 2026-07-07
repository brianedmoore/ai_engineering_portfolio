# Workflow

## Core Workflow

This project supports one evidence-backed home inspection observation.

An observation can begin in multiple ways:

- Photo first
- Typed note first
- Audio narration first

The order does not matter. A complete observation requires both:

1. At least one photo
2. At least one typed note or audio transcript

## Supported Input Paths

### Path 1: Photo First

The inspector notices an issue and captures one or more photos.

The system stores the photo evidence but marks the observation as incomplete until the inspector adds either a typed note or audio narration.

### Path 2: Text First

The inspector types a quick field note.

The system stores the description but marks the observation as incomplete until at least one photo is added.

### Path 3: Audio First

The inspector records a short audio note.

The system stores the transcript but marks the observation as incomplete until at least one photo is added.

### Path 4: Complete Input

The inspector provides both photo evidence and a typed note or audio transcript.

The system can generate a structured observation for inspector review.

## Completion Rule

The system should not create a complete report-ready observation unless the following condition is true:

- at least one photo AND at least one text or audio description

## Generated Observation

Once the observation is complete, the system generates:

- Title
- Room or area
- Home system
- Component
- Defect type
- Severity
- Safety flag
- Professional report description
- Plain-English summary
- Recommended action
- Responsible professional
- Estimated cost range
- Human-review flag
- Missing-information list
- Human Review

All generated observations require inspector review.
The system may draft and classify the observation, but the inspector remains responsible for approving, editing, or rejecting the final language.
