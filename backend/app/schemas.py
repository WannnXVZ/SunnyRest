from pydantic import BaseModel
from typing import Dict

class PredictionResponse(BaseModel):
    label: str
    confidence: float
    scores: Dict[str, float]
    model_version: str

class EnhanceResponse(BaseModel):
    method: str
    params: Dict[str, int]
    model_version: str
    ms: float

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
