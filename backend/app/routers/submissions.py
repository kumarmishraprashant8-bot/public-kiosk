from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Submission, Receipt, User, PredictedEvent
from app.schemas import SubmissionCreate, SubmissionResponse, ReceiptResponse
from app.receipt import compute_receipt_hash, get_prev_hash, generate_receipt_id, generate_short_code, create_qr_data
from app.auth import verify_token, get_current_user
from app.config import settings
import json

router = APIRouter(prefix="/submission", tags=["submissions"])


from app.utils.nlu import detect_language
from app.similarity import calculate_text_similarity, haversine_distance
from app.schemas_duplicate import DuplicateCheckRequest, DuplicateCheckResponse

@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
async def check_duplicate(
    check: DuplicateCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Check if a similar complaint exists nearby.
    """
    # 1. Fetch active complaints (not resolved)
    active_submissions = db.query(Submission).filter(
        Submission.status.in_(["pending", "assigned", "investigating"])
    ).all()
    
    best_match = None
    highest_confidence = 0.0
    min_distance = float('inf')
    
    for sub in active_submissions:
        # Distance check (if coords available)
        dist = 0.0
        if check.latitude and check.longitude and sub.latitude and sub.longitude:
            dist = haversine_distance(check.latitude, check.longitude, sub.latitude, sub.longitude)
            # Filter by radius (e.g., 100m)
            if dist > 100:
                continue
        
        # Text similarity check
        similarity = calculate_text_similarity(check.text, sub.text)
        
        # Combined confidence
        confidence = similarity
        if dist < 20: # Very close
            confidence += 0.2
            
        if confidence > highest_confidence:
            highest_confidence = confidence
            best_match = sub
            min_distance = dist
            
    is_duplicate = highest_confidence > 0.6
    
    return DuplicateCheckResponse(
        is_duplicate=is_duplicate,
        confidence=min(highest_confidence, 1.0),
        similar_submission_id=best_match.id if best_match else None,
        similar_text=best_match.text if best_match else None,
        distance_meters=min_distance if best_match else None,
        message="Similar complaint found nearby!" if is_duplicate else "No duplicates found."
    )


@router.post("", response_model=ReceiptResponse)
async def create_submission(
    submission: SubmissionCreate,
    kiosk_id: str = "kiosk-001",  # Default kiosk ID, can be passed as header
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new complaint submission.
    Returns receipt with QR data and hash chain.
    """
    # Detect language
    detected_lang = detect_language(submission.text)

    # Create submission
    db_submission = Submission(
        user_id=current_user.id,
        intent=submission.intent,
        text=submission.text,
        language=detected_lang,
        latitude=submission.latitude,
        longitude=submission.longitude,
        postal_code=submission.postal_code,
        ward=submission.ward,
        uploaded_files=submission.uploaded_files,
        ocr_parsed_data=submission.ocr_parsed_data,
        status="pending",
        priority="normal"
    )
    db.add(db_submission)
    db.flush()

    # Emergency Detection Logic (Psychic Intercept)
    emergency_keywords = ["fire", "gas leak", "explosion", "flood", "earthquake", "collapse", "smoke"]
    is_emergency = any(k in submission.text.lower() for k in emergency_keywords) or submission.intent in ["fire", "accident"]
    
    if is_emergency:
        db_submission.priority = "CRITICAL"
        
        # Create Predicted Event for Psychic Intercept
        event = PredictedEvent(
            center_lat=submission.latitude or 12.9716, # Default to Bangalore center if null
            center_lng=submission.longitude or 77.5946,
            predicted_intent=submission.intent,
            confidence=0.98,
            status="predicted"
        )
        db.add(event)
        db.flush()
        db_submission.predicted_event_id = event.id
    
    # Prepare submission JSON for hash
    submission_json = {
        "id": db_submission.id,
        "intent": db_submission.intent,
        "text": db_submission.text,
        "created_at": db_submission.created_at.isoformat() if db_submission.created_at else None
    }
    
    # Get previous hash for this kiosk
    prev_hash = get_prev_hash(db, kiosk_id)
    
    # Compute receipt hash
    receipt_hash = compute_receipt_hash(submission_json, prev_hash)
    
    # Generate receipt ID and short_code
    receipt_id = generate_receipt_id()
    short_code = generate_short_code()

    # Create receipt
    receipt = Receipt(
        receipt_id=receipt_id,
        short_code=short_code,
        submission_id=db_submission.id,
        receipt_hash=receipt_hash,
        prev_hash=prev_hash,
        kiosk_id=kiosk_id
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    # Generate QR data (use short_code for track URL)
    qr_data = create_qr_data(receipt_id, receipt_hash, short_code)

    return ReceiptResponse(
        receipt_id=receipt_id,
        short_code=short_code,
        receipt_hash=receipt_hash,
        qr_data=qr_data,
        created_at=receipt.created_at
    )

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(submission_id: int, db: Session = Depends(get_db)):
    """Get submission by ID"""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission
