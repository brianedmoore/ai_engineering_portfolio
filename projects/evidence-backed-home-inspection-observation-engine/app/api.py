from fastapi import FastAPI, HTTPException
from app.schemas import ObservationInput, StructuredObservation
from app.observation_factory import create_basic_structured_observation

app = FastAPI(
    title="Home Inspection Observation Engine",
    description="Accepts inspector field notes and returns a structured, AI-generated observation.",
    version="0.1.0"
)


@app.post("/observations", response_model=StructuredObservation)
def create_observation(observation_id: str, observation_input: ObservationInput):
    try:
        return create_basic_structured_observation(observation_id, observation_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))