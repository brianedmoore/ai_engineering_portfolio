import base64
from datetime import datetime
from typing import Optional
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from sqlmodel import Session, select
from app.schemas import (
    Inspection, Inspector, StructuredObservation, ObservationStatus,
    Photo, NotInspectedObservation, Severity,
)
from app.disclosures import get_applicable_disclaimers

TEMPLATES_DIR = Path(__file__).parent / "templates"

SYSTEM_ORDER = [
    "Roofing", "Exterior", "Structure", "Electrical", "Plumbing",
    "HVAC", "Water Heater", "Interior", "Insulation and Ventilation",
    "Appliances", "Garage", "Site and Grounds", "Fireplace", "Other",
]

WMO_EMOJI = {
    0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
    45: "🌫", 48: "🌫",
    51: "🌦", 53: "🌦", 55: "🌧",
    61: "🌧", 63: "🌧", 65: "🌧",
    71: "🌨", 73: "🌨", 75: "❄️", 77: "❄️",
    80: "🌦", 81: "🌧", 82: "⛈",
    85: "🌨", 86: "🌨",
    95: "⛈", 96: "⛈", 99: "⛈",
}

SEVERITY_COLOR = {
    "Safety Hazard": "#dc2626",
    "Deficiency":    "#d97706",
    "Advisory":      "#2563eb",
}

SEVERITY_BG = {
    "Safety Hazard": "#fef2f2",
    "Deficiency":    "#fffbeb",
    "Advisory":      "#eff6ff",
}

SEVERITY_BORDER = {
    "Safety Hazard": "#fecaca",
    "Deficiency":    "#fde68a",
    "Advisory":      "#bfdbfe",
}

COST_DISPLAY = {
    "$0-$100":     "Minor (under $100)",
    "$100-$300":   "Minor ($100–$300)",
    "$300-$750":   "Moderate ($300–$750)",
    "$750-$2,500": "Moderate ($750–$2,500)",
    "$2,500+":     "Major ($2,500+)",
    "Unknown":     "To be determined",
}

MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]


def _b64_img(data: Optional[bytes], content_type: str = "image/jpeg") -> Optional[str]:
    if not data:
        return None
    return f"data:{content_type};base64,{base64.b64encode(data).decode()}"


def _fmt_date(dt: Optional[datetime]) -> str:
    if not dt:
        return "—"
    return dt.strftime("%B %d, %Y")


def _fmt_datetime(dt: Optional[datetime]) -> str:
    if not dt:
        return "—"
    return dt.strftime("%B %d, %Y at %I:%M %p")


def _load_photo(obs: StructuredObservation, session: Session) -> Optional[str]:
    if not obs.photo_ids:
        return None
    photo = session.get(Photo, obs.photo_ids[0])
    return _b64_img(photo.data, photo.content_type) if photo else None


def _finding_dict(obs: StructuredObservation, finding_id: str, session: Session) -> dict:
    sev = obs.severity or "Advisory"
    return {
        "id": finding_id,
        "obs": obs,
        "photo": _load_photo(obs, session),
        "severity_color":  SEVERITY_COLOR.get(sev, "#6b7280"),
        "severity_bg":     SEVERITY_BG.get(sev, "#f8fafc"),
        "severity_border": SEVERITY_BORDER.get(sev, "#e2e8f0"),
        "cost_display":    COST_DISPLAY.get(obs.estimated_cost_range or "", obs.estimated_cost_range or ""),
        "sev_class": {
            "Safety Hazard": "sev-safety",
            "Deficiency":    "sev-deficiency",
            "Advisory":      "sev-advisory",
        }.get(sev, "sev-advisory"),
    }


def build_report_context(inspection_id: int, inspector: Inspector, session: Session) -> dict:
    inspection = session.get(Inspection, inspection_id)
    if not inspection:
        raise ValueError(f"Inspection {inspection_id} not found")

    approved = session.exec(
        select(StructuredObservation)
        .where(StructuredObservation.inspection_id == inspection_id)
        .where(StructuredObservation.status == ObservationStatus.APPROVED)
    ).all()

    # Group by system in InterNACHI order
    obs_by_system: dict[str, list] = {}
    for obs in approved:
        obs_by_system.setdefault(obs.system or "Other", []).append(obs)

    sections = []
    all_findings: list[dict] = []
    section_num = 0

    for system in SYSTEM_ORDER:
        if system not in obs_by_system:
            continue
        section_num += 1
        findings = []
        for i, obs in enumerate(obs_by_system[system], 1):
            f = _finding_dict(obs, f"{section_num}.{i}", session)
            findings.append(f)
            all_findings.append(f)
        sections.append({
            "name": system,
            "number": section_num,
            "findings": findings,
            "safety_count":     sum(1 for f in findings if f["obs"].severity == Severity.SAFETY_HAZARD),
            "deficiency_count": sum(1 for f in findings if f["obs"].severity == Severity.DEFICIENCY),
            "advisory_count":   sum(1 for f in findings if f["obs"].severity == Severity.ADVISORY),
        })

    # Executive summary — up to 5, Safety Hazard first
    priority = [f for f in all_findings if (f["obs"].severity or "") in (Severity.SAFETY_HAZARD, Severity.DEFICIENCY)]
    priority.sort(key=lambda f: (0 if f["obs"].severity == Severity.SAFETY_HAZARD else 1))
    executive_summary = priority[:5]

    # EOL consolidated section
    eol_findings = [f for f in all_findings if f["obs"].approaching_end_of_life]

    # Priority action items table (Safety Hazard + Deficiency)
    priority_actions = [f for f in all_findings if (f["obs"].severity or "") in (Severity.SAFETY_HAZARD, Severity.DEFICIENCY)]

    # Not inspected
    not_inspected = list(session.exec(
        select(NotInspectedObservation)
        .where(NotInspectedObservation.inspection_id == inspection_id)
    ).all())

    # Assets
    front_of_house   = _b64_img(inspection.front_of_house_photo_data, inspection.front_of_house_photo_content_type or "image/jpeg")
    inspector_photo  = _b64_img(inspector.headshot_data, inspector.headshot_content_type or "image/jpeg") if inspector.headshot_data else None
    company_logo     = _b64_img(inspector.logo_data) if inspector.logo_data else None

    safety_count     = sum(1 for f in all_findings if f["obs"].severity == Severity.SAFETY_HAZARD)
    deficiency_count = sum(1 for f in all_findings if f["obs"].severity == Severity.DEFICIENCY)
    advisory_count   = sum(1 for f in all_findings if f["obs"].severity == Severity.ADVISORY)

    return {
        "inspection":           inspection,
        "inspector":            inspector,
        "inspector_photo":      inspector_photo,
        "company_logo":         company_logo,
        "front_of_house":       front_of_house,
        "inspection_date_fmt":  _fmt_date(inspection.inspection_date),
        "inspection_dt_fmt":    _fmt_datetime(inspection.inspection_date),
        "sections":             sections,
        "executive_summary":    executive_summary,
        "eol_findings":         eol_findings,
        "priority_actions":     priority_actions,
        "not_inspected":        not_inspected,
        "disclaimers":          get_applicable_disclaimers(inspection),
        "weather":              inspection.weather_data,
        "wmo_emoji":            WMO_EMOJI,
        "month_abbr":           MONTH_ABBR,
        "total_findings":       len(all_findings),
        "safety_count":         safety_count,
        "deficiency_count":     deficiency_count,
        "advisory_count":       advisory_count,
        "severity_color":       SEVERITY_COLOR,
        "severity_bg":          SEVERITY_BG,
        "severity_border":      SEVERITY_BORDER,
    }


def render_report_html(context: dict) -> str:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=True,
    )
    env.filters["fmt_date"] = lambda v: _fmt_date(v) if isinstance(v, datetime) else str(v or "—")
    template = env.get_template("report.html")
    return template.render(**context)
