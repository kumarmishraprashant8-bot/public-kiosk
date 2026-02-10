import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_submission_no_auth():
    """Test submission creation without auth"""
    response = client.post("/submission", json={
        "intent": "water_outage",
        "text": "No water supply"
    })
    assert response.status_code == 401
