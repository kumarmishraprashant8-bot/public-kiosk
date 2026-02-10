from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/emergency", tags=["emergency"])

# In-memory state for demo purposes
class EmergencyState:
    active: bool = False
    level: str = "normal"  # normal, watch, warning, critical
    type: Optional[str] = None  # flood, fire, earthquake, medical
    message: Optional[str] = None

state = EmergencyState()

class EmergencyStatus(BaseModel):
    active: bool
    level: str
    type: Optional[str]
    message: Optional[str]

class EmergencyToggle(BaseModel):
    active: bool
    type: Optional[str] = "flood"
    message: Optional[str] = "Emergency Alert Declared"

@router.get("/status", response_model=EmergencyStatus)
async def get_status():
    return {
        "active": state.active,
        "level": state.level,
        "type": state.type,
        "message": state.message
    }

@router.post("/toggle", response_model=EmergencyStatus)
async def toggle_emergency(payload: EmergencyToggle):
    state.active = payload.active
    if payload.active:
        state.level = "critical"
        state.type = payload.type
        state.message = payload.message
    else:
        state.level = "normal"
        state.type = None
        state.message = None
    
    return {
        "active": state.active,
        "level": state.level,
        "type": state.type,
        "message": state.message
    }
