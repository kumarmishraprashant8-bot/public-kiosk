import pytest
from app.receipt import compute_receipt_hash, generate_receipt_id

def test_compute_receipt_hash():
    """Test receipt hash computation"""
    submission_json = {"id": 1, "intent": "water_outage", "text": "No water"}
    prev_hash = None
    
    hash1 = compute_receipt_hash(submission_json, prev_hash)
    assert len(hash1) == 64  # SHA256 hex length
    assert hash1 != ""
    
    # Same input should produce same hash
    hash2 = compute_receipt_hash(submission_json, prev_hash)
    assert hash1 == hash2
    
    # Different prev_hash should produce different hash
    hash3 = compute_receipt_hash(submission_json, "previous_hash")
    assert hash1 != hash3

def test_generate_receipt_id():
    """Test receipt ID generation"""
    receipt_id = generate_receipt_id()
    assert len(receipt_id) == 36  # UUID length
    assert receipt_id.count("-") == 4  # UUID format
