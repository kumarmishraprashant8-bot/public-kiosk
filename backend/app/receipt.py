import hashlib
import json
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Receipt, Submission

def compute_receipt_hash(submission_json: dict, prev_hash: Optional[str]) -> str:
    """
    Compute receipt hash using hash chain.
    receipt_hash = SHA256(prev_hash + submission_json)
    """
    s = json.dumps(submission_json, sort_keys=True, separators=(",", ":"))
    payload = (prev_hash or "") + s
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def get_prev_hash(db: Session, kiosk_id: str) -> Optional[str]:
    """Get the last receipt hash for a kiosk"""
    last_receipt = db.query(Receipt).filter(
        Receipt.kiosk_id == kiosk_id
    ).order_by(Receipt.created_at.desc()).first()
    
    return last_receipt.receipt_hash if last_receipt else None

def generate_receipt_id() -> str:
    """Generate a unique receipt ID"""
    import uuid
    return str(uuid.uuid4())


def generate_short_code() -> str:
    """Generate a short tracking code (alphanumeric, 8 chars)."""
    import random
    import string
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=8))


def create_qr_data(receipt_id: str, receipt_hash: str, short_code: str = None) -> str:
    """Generate QR code data string for verification/tracking."""
    if short_code:
        return f"TRACK:{short_code}"
    short_hash = receipt_hash[:8]
    return f"{receipt_id}:{short_hash}"
