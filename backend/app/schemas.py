from pydantic import BaseModel
from typing import Any, Dict


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
    classifier_loaded: bool
    sr_loaded: bool
    ipfs_configured: bool = False


class IpfsPinResponse(BaseModel):
    cid: str
    uri: str
    gateway_url: str
    strategy: str


class IpfsPinJsonRequest(BaseModel):
    metadata: Dict[str, Any]
    filename: str = "metadata.json"
