import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_request_otp():
    """Test OTP request endpoint"""
    response = client.post("/auth/request-otp", json={"phone": "+919876543210"})
    assert response.status_code == 200
    assert "message" in response.json()

def test_verify_otp_invalid():
    """Test OTP verification with invalid code"""
    response = client.post("/auth/verify-otp", json={
        "phone": "+919876543210",
        "code": "000000"
    })
    assert response.status_code == 401
