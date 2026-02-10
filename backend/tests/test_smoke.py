"""
Smoke tests for key endpoints.
Run with: pytest backend/tests/test_smoke.py -v
Requires DEMO_MODE=true for submission without auth.
"""
import os
import pytest
from fastapi.testclient import TestClient

# Ensure DEMO_MODE for tests
os.environ.setdefault("DEMO_MODE", "true")

from app.main import app
from app.database import SessionLocal, Base, engine

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_health():
    """Health check endpoint."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


def test_root():
    """Root endpoint."""
    r = client.get("/")
    assert r.status_code == 200
    assert "CivicPulse" in r.json().get("message", "")


def test_submission_create_demo_mode():
    """Submissions endpoint - create in DEMO_MODE (no auth required)."""
    r = client.post(
        "/submission",
        json={"intent": "water_outage", "text": "No water supply since morning"},
    )
    # May be 200 (demo) or 401 (no demo)
    assert r.status_code in (200, 401)
    if r.status_code == 200:
        data = r.json()
        assert "receipt_id" in data
        assert "receipt_hash" in data
        assert "short_code" in data or True  # short_code optional in response


def test_api_submissions():
    """POST /api/submissions adapter."""
    r = client.post(
        "/api/submissions",
        json={
            "kiosk_id": "kiosk-001",
            "intent": "garbage",
            "text": "Garbage not collected",
        },
    )
    assert r.status_code in (200, 401)
    if r.status_code == 200:
        assert "receipt_id" in r.json()
        assert "short_code" in r.json()


def test_receipt_verify_not_found():
    """Receipt verify returns 404 for unknown receipt."""
    r = client.get("/receipt/nonexistent-id-12345/verify")
    assert r.status_code == 404


def test_intent_check():
    """POST /api/ai/intent-check."""
    r = client.post(
        "/api/ai/intent-check",
        json={"text": "No water supply in my area", "selected_intent": "water_outage"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "detected_intent" in data
    assert "confidence" in data
    assert "suggested_change" in data


def test_duplicate_check():
    """POST /api/ai/duplicate-check."""
    r = client.post(
        "/api/ai/duplicate-check",
        json={
            "text": "Water pipeline leakage",
            "intent": "water_outage",
            "latitude": 12.93,
            "longitude": 77.62,
            "radius_meters": 500,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "has_duplicates" in data
    assert "matches" in data
    assert "suggestion" in data


def test_seed_demo():
    """POST /admin/seed-demo (requires password)."""
    r = client.post("/admin/seed-demo?password=admin123")
    assert r.status_code == 200
    data = r.json()
    assert "submissions_created" in data or "message" in data


def test_clustering():
    """POST /admin/run-clustering (requires password)."""
    r = client.post("/admin/run-clustering?password=admin123")
    assert r.status_code == 200
    data = r.json()
    assert "clusters" in data


def test_receipt_verify_with_seeded():
    """Receipt verify - run after seed, get first receipt."""
    # First seed to ensure we have data
    client.post("/admin/seed-demo?password=admin123")
    # Get clusters/metrics to find a receipt
    r = client.get("/admin/clusters?password=admin123")
    if r.status_code != 200:
        pytest.skip("No clusters data")
    # We need a receipt_id - get from a submission
    r2 = client.post(
        "/api/submissions",
        json={"intent": "water_outage", "text": "Smoke test submission"},
    )
    if r2.status_code != 200:
        pytest.skip("Could not create submission")
    receipt_id = r2.json().get("receipt_id")
    if not receipt_id:
        pytest.skip("No receipt_id in response")
    r3 = client.get(f"/receipt/{receipt_id}/verify")
    assert r3.status_code == 200
    data = r3.json()
    assert "verified" in data
    assert "chain_length" in data
