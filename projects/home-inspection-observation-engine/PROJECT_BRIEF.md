# InspectFlow — Project Brief
**Last updated:** 2026-08-25
**Purpose:** Master handoff document. If starting a new AI session, provide this file for full context.

---

## What We're Building

AI-powered home inspection report software. Inspector walks a property, captures observations (photo + audio + text) on their phone, AI writes a structured professional report. Client gets a beautiful, readable report. Inspector gets their time back.

**Core value prop:** You do the walk. We write the report.

**Selling to:** Independent home inspectors and small inspection firms. NOT buyers or agents directly — they consume the output.

**What inspectors care about:** Speed, simplicity, zero friction, value (a lot for a little), looking professional to clients.

**Strategic position:** Go deep on report generation first and be the best at it. Win inspector loyalty there. Expand into scheduling/payments later from a position of strength. Do NOT go wide early like InspectorData did.

---

## Product Name

Current working name: InspectFlow (to be changed — too AI-vibe generic, similar to InspectorData).

**Criteria:** 1-2 syllables, simple, fast-sounding, conveys speed/simplicity/value, not tech-startup-generic. Inspector hears it and thinks "this is for me."

**Top candidates to check domain availability:**
- **Pronto** — Italian/Spanish for "immediately, ready." The entire value prop in the name. "Get your report done, pronto."
- **Clip** — moving at a good clip (fast) + clipboard (inspector's tool). 1 syllable.
- **Crisp** — the reports are crisp, the workflow is crisp. No bloat. 1 syllable.
- **Snap** — snap photos, done in a snap. 1 syllable.

Check: .com domain + Twitter/X + Instagram + LinkedIn for each. `get{name}.com` is acceptable if base .com is taken.

---

## Collaboration Style

- User (Brian Moore) makes ALL code edits. Claude provides: what to change, why, and the git commit message.
- One microtask at a time. Build → test → confirm → next task.
- Brian's father (Brett Moore) is an ASHI-certified CMI home inspector and the primary design/domain expert.
- The app is being built as a portfolio project that could become a real product.

---

## Current Technical Stack

```
Backend:  FastAPI + SQLModel + SQLite (Python)
Frontend: React + TypeScript + Vite + Tailwind CSS
LLM:      Anthropic Claude (primary) + OpenAI (fallback) via abstracted llm_client.py
Audio:    OpenAI Whisper transcription
Storage:  SQLite with BLOB photo/audio storage
```

**Project path:** `projects/home-inspection-observation-engine/`

---

## What Is Fully Built and Working

### Backend (`app/`)
- `schemas.py` — all Pydantic/SQLModel models:
  - `StructuredObservation` with EOL fields (`approaching_end_of_life`, `eol_source`, `eol_reasoning`)
  - `LLMObservationOutput` with `eol_component_key`, `eol_detected_age_years`, `system_profile_updates`
  - 22 system descriptor columns on `Inspection` model (roof_*, hvac_*, water_heater_*, electrical_*, foundation_*, plumbing_*, exterior_*)
  - `system_profile_sources: dict` — tracks "inferred" vs "confirmed" per field
  - `NotInspectedObservation` + `NotInspectedPhoto` tables
  - `EolSource` enum (UNKNOWN/INFERRED/CONFIRMED)
  - `NotInspectedReason` enum (12 MECE values across 5 buckets)
  - `ObservationStatus` includes Raw status
- `eol_engine.py` — pure Python EOL assessment (no LLM), uses EOL_LIFESPANS thresholds from rules.py
- `not_inspected_factory.py` — LLM classification for not-inspected items
- `observation_factory.py` — LLM structured output + EOL engine + system profile extraction
- `prompts.py` — builds observation prompt with EOL keys + system descriptor extraction instructions
- `system_descriptors.py` — `SYSTEM_DESCRIPTORS` config + `build_llm_extraction_prompt()`
- `rules.py` — `EOL_LIFESPANS` thresholds (warn_fraction, max_years per component)
- `api.py` — all endpoints:
  - `POST /observations/raw` — photo + audio, no LLM
  - `POST /observations/not-inspected` — classifies via LLM
  - `POST /observations/{id}/process` — runs LLM on single raw observation
  - `POST /inspections/{id}/process-queue` — sequential queue processing
  - `PATCH /inspections/{id}/profile` — confirm/decline system descriptor fields (uses exclude_unset=True for null-clearing)
  - `GET /inspections/{id}/not-inspected`
  - `GET /not-inspected/{id}`

### Frontend (`frontend/src/pages/`)
- `InspectionsListPage.tsx` — list all inspections, create new
- `InspectionDetailPage.tsx` — full inspection hub:
  - Queue (raw observations) with sequential AI processing + step animation
  - Processed (approved/rejected) observations
  - Not Inspected collapsible section
  - House Profile (22 system descriptor fields, 7 required for report)
  - Generate Report gate — all 7 required fields must have `source === 'confirmed'`
  - Confirm/Decline buttons for auto-detected (inferred) values
  - `QueueItemSteps` — uses `key={itemKey}` to remount and reset step timers per item
- `CapturePage.tsx` — two modes (Observation / Not Inspected), photo + audio + text
- `ReviewPage.tsx` — full observation detail, approve/reject, sibling navigation
- `RawObservationPage.tsx` — raw capture without LLM

### Key Architecture Patterns
- System profile source tracking: "inferred" (LLM) vs "confirmed" (inspector approved)
- EOL provenance: 3-field approach (bool, source enum, reasoning string)
- PATCH uses `exclude_unset=True` — null values clear both value and source (decline)
- `key` prop on React components forces remount to reset step timers
- SQLite: `create_all` doesn't add columns to existing tables — delete DB and recreate after schema changes

---

## Task List — What's Next

### Phase 1 — Report Foundation
| # | Task | Description |
|---|---|---|
| T11 | Inspector profile model | Headshot + logo (blob), name, license, phone, email, website — API + settings UI |
| T12 | Inspection model additions | `front_of_house_photo`, `started_at` (auto-captured, editable), `standards_complied_with` |
| T13 | 5-day weather history | Open-Meteo historical + US Census geocoder → stored as JSON on Inspection |
| T14 | Severity sub-category system | 3-tier + 9 MECE sub-categories (see below), update schema + LLM prompt + UI |
| T15 | Disclosures module | `disclosures.py` — UNIVERSAL_DISCLAIMERS + CONDITIONAL_DISCLAIMERS dict |
| T16 | Utility company DB | Curated JSON by metro area (Atlanta first), auto-populated on reports |
| T17 | Section checklist schema | ASHI/InterNACHI compliant sub-component checklist per system; drives info blocks |
| T18 | Cost magnitude field | `cost_magnitude` enum on StructuredObservation, LLM estimates it |

### Phase 2 — Report Generation
| # | Task | Description |
|---|---|---|
| T19 | Full Report PDF | WeasyPrint + Jinja2, all 12 sections, `GET /inspections/{id}/report.pdf` |
| T20 | Interactive web report | Digital-first HTML, same templates, Simplified/Full toggle, UUID-based URL |
| T21 | Buyer Summary document | Cover + exec summary + priority action items with costs + emergency guide |
| T22 | Agent Repair Request list | Filtered 1-2 page PDF with section codes + cost ranges, "copy for contractor" |

### Phase 3 — Post-Report Features
| # | Task | Description |
|---|---|---|
| T23 | Home Maintenance Guide | LLM-generated custom plan from system descriptors + findings; separate delivery |
| T24 | Inspector vendor list (Phase 1) | "My Trusted Vendors" — shown to clients post-delivery as inspector endorsements |
| T25 | Report delivery portal | Email to client with web link + PDF; Cloudflare + SendGrid |
| T26 | Legacy report upload | PDF upload → async extraction agent → `historical_findings` table for RAG |
| T27 | Contractor directory (Phase 2) | Regional marketplace; contractors pay for listings; inspector endorsements first |

### Phase 4 — Mobile (after ~10 inspector validation)
| # | Task | Description |
|---|---|---|
| T28 | React Native mobile app | Expo + TypeScript; iOS + Android; field capture, offline-first; inspectors only |

### Phase 5 — Platform Expansion (much later)
| # | Task | Description |
|---|---|---|
| T29 | Scheduling / calendar | Appointment booking, SMS/email reminders |
| T30 | Inspector payments | Stripe for collecting inspection fees |

---

## Key Product Decisions (finalized)

### Report Design

**Section order (Buyer Journey):**
1. Cover (front-of-house photo, inspector info, date, weather strip)
2. About This Report (1 page — what inspection is/isn't)
3. Executive Summary (top 3-5 issues, plain English, ≤1 page)
4. Body by System (findings inline with photos)
5. Systems Approaching End of Life (from EOL engine)
6. Not Inspected (consolidated, not per-section disclaimers)
7. Priority Action Items + Summary Table (safety/major with cost ranges)
8. Emergency Reference Guide (utility shutoffs + procedures + utility contacts)
9. Home Maintenance Overview
10. Disclosures & Limitations
11. Standards of Practice (appendix)
12. Departure Certification

**Severity system — 3 tiers (primary badge) + 9 MECE sub-categories (detail layer):**
- 🔴 Safety Hazard → [Immediate Safety | Safety Upgrade]
- 🟠 Deficiency → [Major Repair | Repair/Replace | Evaluate | End of Life]
- 🔵 Advisory → [Maintenance | Monitor | Informational]

**Finding format:**
```
[🟠 DEFICIENCY — End of Life]   §11.3.1   HVAC — Aged Gas Furnace
Description (≤3 sentences). Plain English, specific consequence.
→ Contact a qualified HVAC contractor.
💰 Estimated cost: Major ($2,000–$8,000 replacement)
[Photo inline]
```

**Section info blocks (before findings in each system):**
Structured data table (material, age, condition). Satisfactory items appear here ONLY — never as written findings. No "Appeared serviceable at time of inspection" narrative bloat.

**Section checklist defaults:**
- Required (always, can't remove): Roof, Exterior, Foundation/Structure, HVAC, Plumbing, Electrical, Attic, Interior/Doors/Windows, Kitchen & Appliances, Bathrooms
- Optional (inspector adds when present): Garage, Fireplace/Chimney, Crawl Space, Basement, Pool/Spa, Septic, Well/Private Water, Solar, Generator, Outbuildings
- Short property profile questionnaire at inspection creation auto-configures. Inspector never sees "No Pool — Not Present."

**Target length:** 35–50 pages. Compact. One photo per finding. Finding text ≤3 sentences. No duplication anywhere.

**Weather:** Open-Meteo (free, no key, historical data). US Census Bureau geocoder (free, no key, US-only). Pull 5 days before inspection + inspection day. Display as weather strip on cover page.

**Cost estimates:** LLM generates magnitude bucket (Minor <$500 / Moderate $500-2k / Major $2k-10k / Critical $10k+) for every finding. Show expanded on Priority Action Items. Collapsed (click to expand) on individual findings in body. Disclaimer included.

**Departure Certification (renamed from Final Checklist):**
Includes: appliances off, thermostats returned with before/after values, water not running, access panels re-secured, breakers noted, windows closed, radon equipment status, doors locked, departure timestamp, inspector digital signature.

**Emergency Reference Guide (renamed from Utility Shutoff Locations):**
Per shutoff: location + photo + plain English emergency procedure. Auto-populated utility company contacts from curated regional DB — inspector never enters these manually.

### Platform Architecture

**Digital first. PDF as export.**
- Client/buyer/agent: web link only, responsive, no app download. UUID-based URL.
- Inspector: React Native mobile app (Expo + TypeScript, iOS + Android). Build after ~10 inspector validation.
- Hosting: FastAPI + Jinja2 HTML templates + Cloudflare CDN. Essentially free at early scale.
- PDF: WeasyPrint renders same Jinja2 templates.
- Toggle: Simplified View / Full Report at top of digital report.

### Monetization
1. Inspector subscription — monthly SaaS
2. Contractor directory listing/lead fees — contractors pay platform, inspector never touches this money
3. Inspector's "My Trusted Vendors" is free — they endorse, we surface their vendors first

Inspector referral fees directly = ethics risk (ASHI/InterNACHI conflict of interest). Keep inspector clean — they endorse unpaid, we monetize the contractor side.

### AI / LLM Strategy

**Per-inspector voice personalization:** RAG, not fine-tuning. Vectorize historical findings per inspector. At prompt time, retrieve 3-5 semantically similar past findings → include as few-shot examples → LLM writes in their style. Cost: near-zero. Scalable without separate models.

**Legacy report upload (for training data):**
- Accept any PDF (Spectora, HomeGauge, ReportHost, custom)
- Async extraction agent: pdfplumber → LLM classifies findings → PII scrub → `historical_findings` table
- Inspector incentive: "Your historical reports train your AI to write like you"
- Privacy promise (plain English, not ToS): patterns extracted, PII never stored, data never sold or shared
- Old PDFs stored as-is for inspector archive access (no conversion required)

**Cost calibration:** Every processed inspection adds data. Regional cost estimates improve over time. Not in most current reports — build from day one, improve with data.

### Competitors Analyzed
- **Spectora** ($109+/mo): Best visual quality, #1 photo handling complaints, Fixle trust wound — inspectors actively leaving
- **HomeGauge** (~$89/mo, now owned by Spectora): CRL repair request list is best market feature; acquisition anxiety = churn opportunity
- **ISN**: Back-office CRM for multi-inspector firms, not a report tool; large price hike resentment
- **InspectorData** ($79/mo, ~400 inspectors): Web-first, compact format (33 pages), has cost estimates and 5-day weather, but broken PDF rendering, went too wide on features, not deep enough on any

**Our differentiation:** Best report quality + speed, inspector-focused (not buyer-ad-monetized), clean client data pledge, deepest AI integration for report generation.

### Standards Compliance
- ASHI / InterNACHI SOP Oct 2022
- Required report sections covered by our section order
- `standards_complied_with` field on Inspection model (T12)
- Disclosures module covers all 10 required disclaimer elements (T15)
- Conditional disclaimers auto-applied from house profile (well water, septic, older wiring, pool, radon, cost estimates)

---

## Research Files (detailed)

Located in `.claude/projects/.../memory/` — readable markdown, portable to any model:

| File | Contents |
|---|---|
| `project_home_inspection_engine.md` | Current build state, schema details, what's working |
| `product_strategy.md` | Full monetization model, platform architecture, vendor referral phases, legacy upload strategy |
| `report_design_decisions.md` | Full report design: section order, severity, finding format, weather, cost, anti-patterns |
| `product_naming.md` | Name candidates, criteria, rejected names |
| `research_report_design.md` | WeasyPrint/Jinja2 patterns, PDF generation code snippets |
| `research_competitor_analysis.md` | Spectora/HomeGauge/ISN deep-dive, pain points, strategic opportunities |
| `research_ashi_internachi_standards.md` | Required sections, schema gaps, disclaimer elements |
| `research_inspectordata_competitor.md` | InspectorData analysis — founder, pricing, product weaknesses |
| `feedback_microtask_style.md` | How Claude and Brian collaborate — user makes edits, Claude provides what/why/commit |
| `project_llm_processing_phases.md` | Three-phase LLM processing roadmap |

---

## How to Start a New Session

1. Provide this file (`PROJECT_BRIEF.md`) to the new model
2. Optionally provide specific memory files for deeper context on a topic
3. State which task you want to work on next (current: T11 — Inspector profile model)
4. The collaboration style: user makes all code edits, AI provides what/where/why/commit message
