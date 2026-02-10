from pydantic import BaseModel
from typing import Optional

class DuplicateCheckRequest(BaseModel):
    text: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    intent: Optional[str] = None

class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    confidence: float
    similar_submission_id: Optional[int]
    similar_text: Optional[str]
    distance_meters: Optional[float]
    message: str
