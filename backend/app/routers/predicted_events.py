from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import PredictedEvent, Submission, Receipt
from pydantic import BaseModel
import secrets
import hashlib
from datetime import datetime

router = APIRouter(prefix="/api/predicted_events", tags=["predicted_events"])

class ConfirmedEvent(BaseModel):
    id: int
    intent: str
    status: str
    confidence: float

@router.get("/", response_model=List[ConfirmedEvent])
async def get_predicted_events(db: Session = Depends(get_db)):
    events = db.query(PredictedEvent).filter(
        PredictedEvent.status.in_(['predicted', 'confirmed'])
    ).all()
    return [
        ConfirmedEvent(
            id=e.id, 
            intent=e.predicted_intent, 
            status=e.status, 
            confidence=e.confidence
        ) for e in events
    ]

@router.post("/{event_id}/confirm")
async def confirm_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(PredictedEvent).filter(PredictedEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event.status = 'confirmed'
    
    # Create a "Me Too" submission automatically
    submission = Submission(
        user_id=1, # Demo User
        intent=event.predicted_intent,
        text="Confirmed via Psychic Intercept - I'm affected too!",
        latitude=event.center_lat,
        longitude=event.center_lng,
        status="pending",
        citizen_count=1,
        predicted_event_id=event.id
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    # Generate receipt
    receipt_id = secrets.token_hex(8)
    short_code = f"PSY{secrets.token_hex(3).upper()}"
    receipt_hash = hashlib.sha256(f"{submission.id}:{receipt_id}:{datetime.utcnow().isoformat()}".encode()).hexdigest()[:16]
    
    receipt = Receipt(
        receipt_id=receipt_id,
        submission_id=submission.id,
        short_code=short_code,
        receipt_hash=receipt_hash,
        kiosk_id="psychic-intercept",
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    
    return {"message": "Event confirmed", "submission_id": submission.id, "receipt_id": receipt.receipt_id}

