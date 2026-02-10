from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import os

SECRET_KEY = os.getenv("JWT_SECRET", "dev-jwt-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return f"{secrets.randbelow(900000) + 100000}"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.config import settings

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Extract user from JWT token. In DEMO_MODE, use demo user if no auth."""
    if settings.DEMO_MODE and not authorization:
        demo_user = db.query(User).filter(User.phone == "+91-demo-user").first()
        if not demo_user:
            demo_user = User(phone="+91-demo-user", citizen_id_masked="DEMO***USER")
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
        return demo_user
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
