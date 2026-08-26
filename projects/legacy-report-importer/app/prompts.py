"""
Prompt templates for each extraction node.
Kept here so the nodes stay logic-focused and prompts are easy to iterate on.
"""

PII_EXTRACT_PROMPT = """You are reading a home inspection report. Extract all personally identifiable information.

Report text (first 4000 characters):
{text}

Extract whatever PII is present. Use null for anything not found."""


LAYOUT_CLASSIFY_PROMPT = """You are analyzing a home inspection report's structure.

Report text (first 2000 characters):
{text}

Total pages: {page_count}
Images per page distribution: {image_distribution}

Determine whether photos are placed INLINE (near the findings they document, distributed
throughout the report) or in a GALLERY (clustered at the end or in a separate appendix).

Most modern software (Spectora, HomeGauge) uses inline placement.
Older Word/PDF templates sometimes put all photos at the end.

Classify as:
- "inline" — photos are distributed throughout near their findings
- "gallery" — photos are grouped together, separate from findings text
- "unknown" — cannot determine from structure alone"""


DESCRIBE_IMAGE_PROMPT = """You are reviewing a photo from a home inspection report.

Describe what you see. Focus on:
1. What part of the house is shown (roof, electrical panel, plumbing, foundation, etc.)
2. Any visible defects, damage, or issues
3. The condition of the component

Also determine:
- Whether this is an actual inspection photo (vs. a logo, map, diagram, signature, or decorative image)
- Which home system it most likely relates to

Be concise — 1-3 sentences for the description."""


EXTRACT_HEADER_PROMPT = """You are reading a home inspection report. Extract the property and system information.

Report text:
{text}

Extract the inspection metadata and physical characteristics of the home's major systems.
For system fields, only include what is explicitly stated — do not guess.

{system_descriptors_section}"""


EXTRACT_OBSERVATIONS_PROMPT = """You are reading a home inspection report. Extract every finding, deficiency,
observation, or noted issue — one item per distinct problem.

Report text:
{text}

Rules:
- Each finding should be a single, specific issue (not a whole section summary)
- If one sentence describes two separate problems on different components, split them
- Include advisory/maintenance items, not just deficiencies
- For severity: use "Safety Hazard" for immediate risks, "Deficiency" for repairs needed,
  "Advisory" for maintenance recommendations
- approximate_page: your best estimate of which page this appeared on (0-indexed)
- confidence: 0.0-1.0 — how confident you are in the classification (not the finding itself)

Extract ALL findings, even if the report has 50+. Do not summarize or skip."""


EXTRACT_NOT_INSPECTED_PROMPT = """You are reading a home inspection report.

Find every item that the inspector noted they COULD NOT inspect or DID NOT inspect, and the reason why.

Report text:
{text}

Common reasons: blocked access, locked, concealed, seasonal (AC in winter), safety concern,
outside scope, deferred to specialist (pool, septic, well).

Only include items explicitly noted as not inspected. Do not infer."""


MATCH_IMAGES_INLINE_PROMPT = """Match the following inspection photos to this finding.

Finding:
  Title: {title}
  Component: {component}
  System: {system}
  Description: {description}
  Approximate page in report: {page}

Candidate images (these appear within 1 page of this finding):
{candidates}

Return the indices of images that document this specific finding.
Return an empty list if none of the candidates match.
Do not include images that are only tangentially related."""


MATCH_IMAGES_GALLERY_PROMPT = """You are matching inspection photos to findings for a report where all
photos are grouped in a gallery section (not placed inline with findings).

Findings:
{findings}

Images (index + description):
{images}

For each image, return the index of the finding it most likely documents.
If an image doesn't clearly match any finding, return null for that image.

Return a mapping of image_index -> observation_index (or null)."""
