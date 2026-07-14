"""
Holds rules, criteria, and examples per structured output field.
Update this file to tune LLM classification behavior without touching prompt logic.

Each field entry is a dictionary with the following keys:

  description       What this field represents and how it should be interpreted.

  values            For enum fields only. The exact list of allowed return values.
                    The model must return one of these strings exactly as written.

  criteria          Rules the model should follow when classifying this field.
                    Add to this list to make classification more precise.

  examples          Correct response values that reinforce the desired behavior.
                    Use these to show the model what a good answer looks like.

  negative_examples Incorrect responses the model has produced or is likely to produce.
                    Add to this list over time when the model repeats a mistake on a field.
                    Each entry should name the bad response and explain why it is wrong.

  note              A single catch-all rule or edge case that does not fit neatly into criteria.
                    Leave as an empty string if there is nothing to add.
"""

FIELD_GUIDANCE = {
    "title": {
        "description": "Short descriptive title naming the component and the defect.",
        "criteria": [
            "Should identify the component and what is wrong",
            "Keep it under 10 words",
            "Use plain language, not technical jargon"
        ],
        "examples": [
            "Active leak at kitchen sink P-trap",
            "Missing cover plate at garage outlet",
            "Damaged fascia boards at rear exterior"
        ],
        "negative_examples": [
            "Issue found — too vague, does not name the component or defect",
            "The P-trap under the kitchen sink was found to have an active drip leak — too long, reads like a description not a title"
        ],
        "note": ""
    },
    "room_or_area": {
        "description": "The specific location in the home where the observation was made.",
        "criteria": [
            "Be as specific as the input allows",
            "Use common room names (Kitchen, Master Bathroom, Garage, etc.)",
            "Include directional context if provided (e.g. Rear Exterior, North Bedroom)"
        ],
        "examples": [
            "Kitchen",
            "Garage",
            "Rear exterior wall"
        ],
        "negative_examples": [
            "Inside the house — too vague, no room specified",
            "Near window — missing the room context"
        ],
        "note": ""
    },
    "system": {
        "description": "The home system the defect belongs to.",
        "values": [
            "Roofing",
            "Exterior",
            "Structure",
            "Electrical",
            "Plumbing",
            "HVAC",
            "Interior",
            "Insulation and Ventilation",
            "Appliances",
            "Site and Grounds",
            "Garage",
            "Other"
        ],
        "criteria": [],
        "examples": [],
        "negative_examples": [
            "Garage — do not use because the defect was found in a garage; use the actual system (e.g. Electrical) and let room_or_area capture the location",
            "Interior — do not use as a catch-all for any defect found inside the home; match to the actual system"
        ],
        "note": "Use Garage only when the defect is specific to the garage structure or systems, not simply because the defect was found in the garage."
    },
    "component": {
        "description": "The specific part or component within the system that has the defect.",
        "criteria": [
            "Be specific — name the actual part, not just the system",
            "Use trade-standard terminology where appropriate"
        ],
        "examples": [
            "P-trap",
            "GFCI outlet",
            "Fascia board",
            "Supply line",
            "Breaker panel"
        ],
        "negative_examples": [
            "Pipe — too vague; specify the type (e.g. P-trap, supply line, drain line)",
            "Plumbing — that is the system, not the component"
        ],
        "note": ""
    },
    "defect_type": {
        "description": "A concise label for what is wrong with the component.",
        "criteria": [
            "Describe the condition, not the cause",
            "Use present tense",
            "Keep it short — this is a label, not an explanation"
        ],
        "examples": [
            "Active leak",
            "Missing cover plate",
            "Rot",
            "Corrosion",
            "Improper installation",
            "Damaged boards"
        ],
        "negative_examples": [
            "The P-trap is leaking because the slip joint washer is worn — describes cause, not condition; use 'Active leak'",
            "Bad condition — too vague to be useful"
        ],
        "note": ""
    },
    "severity": {
        "description": "How serious the defect is.",
        "values": ["Low", "Medium", "High"],
        "criteria": [
            "Low: cosmetic or minor, no immediate risk (e.g. peeling paint, worn threshold, hairline crack in drywall)",
            "Medium: functional issue that should be addressed, no immediate danger (e.g. damaged trim, slow drain, missing caulk at window)",
            "High: immediate safety risk or active damage in progress (e.g. active water leak, exposed wiring, structural failure, mold)"
        ],
        "examples": [],
        "negative_examples": [
            "Medium for a missing outlet cover plate with exposed wiring — exposed wiring is a direct safety risk and must be High",
            "High for peeling paint or a worn door threshold — cosmetic issues with no safety or water risk are Low"
        ],
        "note": "When uncertain between Medium and High, use High if there is active damage or a direct safety risk to occupants."
    },
    "safety_related": {
        "description": "Whether the defect poses a direct safety risk to occupants.",
        "values": ["true", "false"],
        "criteria": [
            "True if the defect could directly cause injury, fire, electrocution, flooding, or structural failure",
            "False if the risk is property damage only or purely cosmetic"
        ],
        "examples": [],
        "negative_examples": [
            "True for a slow drain — functional issue only, no direct risk to occupants",
            "False for exposed wiring — direct electrocution risk, must be true"
        ],
        "note": "Exposed wiring, active leaks near electrical, and structural issues should always be true."
    },
    "professional_report_description": {
        "description": "Formal language written in third person suitable for an official home inspection report.",
        "criteria": [
            "Write in third person (e.g. 'The inspector observed...')",
            "Be factual and objective — describe what was observed, not interpreted",
            "Include the location, component, and condition",
            "Avoid first person and informal language"
        ],
        "examples": [
            "The inspector observed an active drip at the P-trap beneath the kitchen sink. The cabinet base was wet at the time of inspection, indicating an ongoing leak condition."
        ],
        "negative_examples": [
            "I saw a leak under the sink — first person, not appropriate for a formal report",
            "There's a leak — too brief, missing location and component detail"
        ],
        "note": ""
    },
    "plain_english_summary": {
        "description": "A simple, jargon-free explanation written for a homeowner with no technical background.",
        "criteria": [
            "Write in second person (e.g. 'There is a leak under your kitchen sink')",
            "Avoid technical terms — explain them if necessary",
            "Keep it to 1-2 sentences",
            "Focus on what it means for the homeowner, not the technical detail"
        ],
        "examples": [
            "There is a leak under your kitchen sink that is getting the cabinet wet and should be fixed by a plumber."
        ],
        "negative_examples": [
            "The P-trap exhibited an active leak condition at the slip joint — too technical, not written for a homeowner",
            "The inspector observed a drip at the P-trap — third person; this field should speak directly to the homeowner"
        ],
        "note": ""
    },
    "recommended_action": {
        "description": "What should be done to address the defect.",
        "criteria": [
            "Be specific about the action (repair, replace, evaluate, monitor)",
            "Name the professional if applicable",
            "Use 1-2 sentences — include a follow-up verification step when safety or water damage is involved",
            "For electrical defects, alwang and outlet condition before closing upor covering",
            "For water or moisture defectadjacent materials for secondary damageafter the repair"
        ],
        "examples": [
            "Have a licensed plumber repatop the active leak. After the repair,inspect the cabinet base and subfloor for any water damage.",
            "Install an appropriate outleg, verify the outlet and wiring are ingood condition.",
            "Have a handyman replace the nspect for underlying moisture damage. Ensure proper caulking and sealing around the window after the repair."
        ],
        "negative_examples": [
            "Fix it — too vague, does not name the action or professional",
            "Have a plumber fix the P-trap — correct first step but missing the follow-up inspection for water damage",
            "Install a cover plate on the outlet — correct first step but missing the safety verification of wiring condition",
            "This defect should be addressed by a qualified professional at the earliest convenience — vague and does not specify what needs to be done"
        ],
        "note": "Always think beyond the immediate fix — what should be verified or inspected after the repair is made?"
    },
    "responsible_professional": {
        "description": "The type of professional best suited to address the defect.",
        "values": [
            "Homeowner/DIY",
            "Handyman",
            "Plumber",
            "Electrician",
            "HVAC Technician",
            "Roofer",
            "Structural Engineer",
            "Foundation Contractor",
            "General Contractor",
            "Appliance Technician",
            "Pest Control Professional",
            "Mold/Water Mitigation Professional",
            "Qualified Specialist",
            "Further Evaluation Recommended"
        ],
        "criteria": [
            "Match the professional to the specific defect, not just the system",
            "Use Handyman for straightforward carpentry, minor repairs, and cosmetic fixes that do not require a licensed trade",
            "Use General Contractor for larger scope work involving multiple trades or significant structural repair",
            "Use Further Evaluation Recommended when the root cause is unclear",
            "Use Qualified Specialist when a licensed trade is needed but the specific trade is ambiguous"
        ],
        "examples": [],
        "negative_examples": [
            "General Contractor for damaged exterior trim boards — straightforward carpentry is a Handyman job, not a General Contractor",
            "General Contractor for a clearly electrical defect — use Electrician when the trade is unambiguous",
            "Qualified Specialist for a leaking P-trap — the trade is clearly Plumber; reserve Qualified Specialist for ambiguous cases"
        ],
        "note": "A missing cover plate is Homeowner/DIY. Active water damage may need both a Plumber and a Mold/Water Mitigation Professional."
    },
    "estimated_cost_range": {
        "description": "Estimated repair cost range for this defect.",
        "values": [
            "$0-$100",
            "$100-$300",
            "$300-$750",
            "$750-$2,500",
            "$2,500+",
            "Unknown"
        ],
        "criteria": [
            "Estimate based on typical US repair costs for the defect type",
            "Consider both labor and materials",
            "Use Unknown if the root cause or scope is unclear"
        ],
        "examples": [],
        "negative_examples": [
            "$300-$750 for replacing a missing outlet cover plate — a cover plate costs under $5 and takes minutes to install; use $0-$100",
            "Any specific range when the extent of damage is unknown — use Unknown rather than guessing"
        ],
        "note": "Use Unknown rather than guessing when the extent of damage cannot be determined from the input."
    },
    "confidence": {
        "description": "How confident the model is in the classification, from 0.0 to 1.0.",
        "criteria": [
            "1.0: all fields are clearly supported by the input",
            "0.7-0.9: most fields are clear but one or two required inference",
            "0.5-0.7: significant inference was required due to limited input",
            "Below 0.5: input was too vague to classify reliably"
        ],
        "examples": [],
        "negative_examples": [
            "1.0 when the component or defect type was inferred rather than explicitly stated in the input",
            "0.3 for a clearly and completely described defect — low confidence should reflect poor input quality, not an easy or minor defect"
        ],
        "note": "Confidence should reflect input quality, not severity. A clearly described minor defect should still score high confidence."
    }
}
