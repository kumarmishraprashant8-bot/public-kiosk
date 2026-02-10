from fastapi import APIRouter, Depends
from pydantic import BaseModel
import random
from typing import Optional

router = APIRouter(prefix="/routing", tags=["routing"])

class RoutingRequest(BaseModel):
    intent: str
    priority: str = "normal"
    text: Optional[str] = None

class RoutingResponse(BaseModel):
    department: str
    sla_hours: int
    assigned_officer: str
    status: str = "Assigned"

DEPARTMENTS = {
    "water_outage": "Water Supply Board (BWSSB)",
    "electricity_outage": "Electricity Board (BESCOM)",
    "garbage": "Waste Management (BBMP)",
    "road": "Road Infrastructure (BBMP)",
    "sewage": "Sewage Board (BWSSB)",
    "streetlight": "Lighting Dept (BBMP)"
}

OFFICERS = {
    "water_outage": ["Ramesh Gupta", "Suresh Reddy", "Anjali Rao"],
    "electricity_outage": ["Vikram Singh", "Priya K", "Amit Patel"],
    "garbage": ["Kumar S", "Deepa M"],
    "road": ["Rajesh K", "Mohan L"],
    "sewage": ["Sanjay D"],
    "streetlight": ["Vinay P"]
}

def calculate_sla(priority: str) -> int:
    if priority == "CRITICAL": return 4
    if priority == "HIGH": return 24
    if priority == "MEDIUM": return 48
    return 72  # Low/Normal

def get_routing_info(intent: str, priority: str = "normal") -> dict:
    dept = DEPARTMENTS.get(intent, "General Civic Services")
    officers = OFFICERS.get(intent, ["Officer on Duty"])
    officer = random.choice(officers)
    sla = calculate_sla(priority.upper())
    
    return {
        "department": dept,
        "sla_hours": sla,
        "assigned_officer": officer
    }

@router.post("/assign", response_model=RoutingResponse)
async def assign_route(request: RoutingRequest):
    """
    Determine department, SLA, and assigned officer based on intent/priority.
    """
    info = get_routing_info(request.intent, request.priority)
    return RoutingResponse(**info)
