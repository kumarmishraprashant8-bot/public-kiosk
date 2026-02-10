from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Submission, User
from app.schemas import SubmissionResponse
import re

router = APIRouter(
    prefix="/api/integrations",
    tags=["integrations"],
    responses={404: {"description": "Not found"}},
)

class SMSMessage(BaseModel):
    message: str
    sender: Optional[str] = "+0000000000"
    phone: Optional[str] = None # Support both sender and phone field names

@router.post("/simulate-sms", response_model=SubmissionResponse)
def simulate_sms(sms: SMSMessage, db: Session = Depends(get_db)):
    """
    Simulate an incoming SMS message.
    Simple heuristic parsing to extract intent and location.
    """
    message_text = sms.message
    message_lower = message_text.lower()
    
    # 1. Heuristic Intent Detection
    intent = "general_query"
    if "water" in message_lower or "leak" in message_lower or "pipe" in message_lower:
        intent = "water_supply"
    elif "road" in message_lower or "pothole" in message_lower or "street" in message_lower:
        intent = "road_repair"
    elif "garbage" in message_lower or "trash" in message_lower or "waste" in message_lower:
        intent = "waste_management"
    elif "electric" in message_lower or "power" in message_lower or "light" in message_lower:
        intent = "electricity"
    
    # 2. Heuristic Location Detection (Simple regex for "at [Location]")
    location_match = re.search(r"\b(at|in|near)\s+([a-zA-Z0-9\s,]+)", message_text, re.IGNORECASE)
    detected_ward = "Central" # Default
    if location_match:
        # extracted location hint, might not be a ward, but store it if we had a field. 
        # For now, just use a default ward or try to map.
        pass

    # 3. Find or Create Dummy SMS User
    sender_number = sms.phone if sms.phone else sms.sender
    user = db.query(User).filter(User.phone == sender_number).first()
    if not user:
        user = User(
            phone=sender_number,
            citizen_id_masked="SMS-USER-" + sender_number[-4:]
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 4. Create Submission
    submission = Submission(
        user_id=user.id,
        intent=intent,
        text=f"[SMS] {message_text}",
        status="pending",
        citizen_count=1,
        priority="normal",
        ward=detected_ward,
        language="en" # Assume English for this simple mock
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission
