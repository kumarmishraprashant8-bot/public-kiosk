"""
Anonymous reporting endpoint for sensitive complaints.
Ensures no PII is stored for whistleblower protection.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import hashlib
import secrets
import uuid

from app.database import get_db
from app.models import Submission, Receipt

router = APIRouter(prefix="/anonymous", tags=["anonymous"])


class AnonymousReport(BaseModel):
    """Anonymous report - no phone, no user ID stored."""
    intent: str
    text: str
    ward: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    uploaded_files: Optional[str] = None


@router.post("/report")
async def submit_anonymous_report(
    report: AnonymousReport,
    db: Session = Depends(get_db)
):
    """
    Submit a fully anonymous report.
    - No user ID or phone stored
    - Only a one-time tracking code is provided
    - Suitable for corruption/sensitive reports
    """
    # Generate anonymous tracking ID
    anonymous_id = str(uuid.uuid4())
    tracking_code = f"ANON-{secrets.token_hex(4).upper()}"
    
    # Create submission with minimal data
    submission = Submission(
        user_id=None,  # Explicitly no user
        intent=report.intent,
        text=report.text,
        ward=report.ward,
        latitude=report.latitude,
        longitude=report.longitude,
        uploaded_files=report.uploaded_files,
        priority="normal",
        status="pending",
        source="anonymous_portal",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    # Generate receipt hash without linking to user
    receipt_hash = hashlib.sha256(
        f"{submission.id}:{anonymous_id}:{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()[:16]
    
    # Create receipt
    receipt = Receipt(
        receipt_id=anonymous_id,
        submission_id=submission.id,
        short_code=tracking_code,
        receipt_hash=receipt_hash,
        qr_data=f"civicpulse://track/{tracking_code}",
    )
    db.add(receipt)
    db.commit()
    
    return {
        "status": "submitted",
        "tracking_code": tracking_code,
        "message": "Your anonymous report has been filed. Save your tracking code - it cannot be recovered.",
        "warning": "⚠️ This code is the ONLY way to track your report. We do not store any identifying information.",
        "track_url": f"/track/{tracking_code}",
    }


@router.get("/track/{code}")
async def track_anonymous_report(code: str, db: Session = Depends(get_db)):
    """
    Track an anonymous report by code.
    Returns minimal information to protect identity.
    """
    receipt = db.query(Receipt).filter(Receipt.short_code == code).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Report not found")
    
    submission = db.query(Submission).filter(Submission.id == receipt.submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Report data not found")
    
    # Return minimal safe information
    return {
        "tracking_code": code,
        "status": submission.status,
        "category": submission.intent,
        "filed_date": receipt.created_at.strftime("%Y-%m-%d") if receipt.created_at else None,
        "last_update": submission.updated_at.strftime("%Y-%m-%d %H:%M") if submission.updated_at else None,
        "ward": submission.ward,
        # Do NOT return text, location, or any other PII
    }


@router.get("/sensitive-categories")
async def get_sensitive_categories():
    """
    Return categories that should use anonymous reporting.
    """
    return {
        "categories": [
            {
                "id": "corruption",
                "name": "Corruption / Bribery",
                "icon": "💰",
                "description": "Report demands for bribes or corrupt practices",
                "recommend_anonymous": True
            },
            {
                "id": "fraud",
                "name": "Fund Misuse",
                "icon": "📊",
                "description": "Report misuse of public funds or fake projects",
                "recommend_anonymous": True
            },
            {
                "id": "harassment",
                "name": "Official Harassment",
                "icon": "⚠️",
                "description": "Report harassment by officials",
                "recommend_anonymous": True
            },
            {
                "id": "safety",
                "name": "Safety Concern",
                "icon": "🚨",
                "description": "Report dangerous conditions or safety violations",
                "recommend_anonymous": False
            },
            {
                "id": "pollution",
                "name": "Environmental Violation",
                "icon": "🏭",
                "description": "Report illegal dumping or pollution",
                "recommend_anonymous": False
            },
        ],
        "advisory": "For sensitive reports, we recommend using anonymous submission. No personal data is stored."
    }
