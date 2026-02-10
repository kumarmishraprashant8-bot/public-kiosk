from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Receipt, Submission
from app.schemas import ReceiptVerifyResponse
from app.receipt import compute_receipt_hash
from app.routers.routing import get_routing_info
import json

router = APIRouter(prefix="/receipt", tags=["receipts"])


@router.get("/verify-shortcode/{short_code}", response_model=ReceiptVerifyResponse)
async def verify_receipt_by_shortcode(short_code: str, db: Session = Depends(get_db)):
    """
    Verify receipt hash chain integrity using short code.
    """
    receipt = db.query(Receipt).filter(Receipt.short_code == short_code).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Short code not found")
    
    return await verify_receipt(receipt.receipt_id, db)

@router.get("/{receipt_id}/verify", response_model=ReceiptVerifyResponse)
async def verify_receipt(receipt_id: str, db: Session = Depends(get_db)):
    """
    Verify receipt hash chain integrity.
    Returns verification status and chain position.
    """
    receipt = db.query(Receipt).filter(Receipt.receipt_id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    # Get submission
    submission = db.query(Submission).filter(Submission.id == receipt.submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Prepare submission JSON
    submission_json = {
        "id": submission.id,
        "intent": submission.intent,
        "text": submission.text
    }
    
    # Recompute hash
    computed_hash = compute_receipt_hash(submission_json, receipt.prev_hash)
    
    # Verify
    verification = "OK" if computed_hash == receipt.receipt_hash else "FAIL"
    
    # Calculate chain position and length for same kiosk
    chain_position = db.query(Receipt).filter(
        Receipt.kiosk_id == receipt.kiosk_id,
        Receipt.created_at < receipt.created_at
    ).count() + 1
    chain_length = db.query(Receipt).filter(Receipt.kiosk_id == receipt.kiosk_id).count()

    return ReceiptVerifyResponse(
        receipt_id=receipt_id,
        verification=verification,
        verified=(computed_hash == receipt.receipt_hash),
        chain_position=chain_position,
        chain_length=chain_length,
        receipt_hash=receipt.receipt_hash,
        chain_hash=getattr(receipt, "chain_hash", receipt.receipt_hash),
        prev_hash=receipt.prev_hash
    )

@router.get("/by-submission/{submission_id}")
async def get_receipt_by_submission(submission_id: int, db: Session = Depends(get_db)):
    """Get receipt for a submission (used after join flow)."""
    receipt = db.query(Receipt).filter(Receipt.submission_id == submission_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found for this submission")
    submission = db.query(Submission).filter(Submission.id == receipt.submission_id).first()
    return {
        "receipt_id": receipt.receipt_id,
        "short_code": receipt.short_code,
        "receipt_hash": receipt.receipt_hash,
        "created_at": receipt.created_at,
        "submission": {
            "id": submission.id,
            "intent": submission.intent,
            "text": submission.text,
            "status": submission.status,
        } if submission else None,
        "routing": get_routing_info(submission.intent, submission.priority) if submission else None
    }




@router.get("/{receipt_id}")
async def get_receipt(receipt_id: str, db: Session = Depends(get_db)):
    """Get receipt details"""
    receipt = db.query(Receipt).filter(Receipt.receipt_id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    submission = db.query(Submission).filter(Submission.id == receipt.submission_id).first()
    
    return {
        "receipt_id": receipt.receipt_id,
        "short_code": getattr(receipt, "short_code", None),
        "receipt_hash": receipt.receipt_hash,
        "created_at": receipt.created_at,
        "submission": {
            "id": submission.id,
            "intent": submission.intent,
            "text": submission.text,
            "status": submission.status
        } if submission else None,
        "routing": get_routing_info(submission.intent, submission.priority) if submission else None
    }

