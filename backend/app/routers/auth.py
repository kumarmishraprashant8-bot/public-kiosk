from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, OTP
from app.schemas import OTPRequest, OTPVerify, Token
from app.auth import generate_otp, create_access_token
from app.config import settings
import logging

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

@router.post("/request-otp", response_model=dict)
async def request_otp(request: OTPRequest, db: Session = Depends(get_db)):
    """
    Request OTP for phone number.
    OTP is printed to server logs for demo purposes.
    """
    phone = request.phone.strip()
    
    # Generate OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store OTP in database
    otp_record = OTP(
        phone=phone,
        code=otp_code,
        expires_at=expires_at
    )
    db.add(otp_record)
    db.commit()
    
    # Log OTP for demo (in production, send via SMS)
    logger.info(f"OTP for {phone}: {otp_code}")
    print(f"\n{'='*50}")
    print(f"OTP REQUESTED for phone: {phone}")
    print(f"OTP CODE: {otp_code}")
    print(f"{'='*50}\n")
    
    return {"message": "OTP sent successfully", "phone": phone}

@router.post("/verify-otp", response_model=Token)
async def verify_otp(request: OTPVerify, db: Session = Depends(get_db)):
    """Verify OTP and return JWT token"""
    phone = request.phone.strip()
    code = request.code.strip()
    
    # DEMO BYPASS: Use bypass code to skip OTP verification for hackathon demo
    if code == settings.DEMO_OTP_BYPASS:
        print(f"\n⚠️  DEMO BYPASS: OTP skipped for {phone} (DEMO_MODE={settings.DEMO_MODE})\n")
        # Get or create user directly
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            user = User(phone=phone)
            db.add(user)
            db.commit()
            db.refresh(user)
        access_token = create_access_token(data={"sub": str(user.id), "phone": phone})
        return {"access_token": access_token, "token_type": "bearer"}
    
    # Find valid OTP
    otp_record = db.query(OTP).filter(
        OTP.phone == phone,
        OTP.code == code,
        OTP.used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP"
        )
    
    # Mark OTP as used
    otp_record.used = True
    db.commit()
    
    # Get or create user
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(phone=phone)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Generate JWT token
    access_token = create_access_token(data={"sub": str(user.id), "phone": phone})
    
    return {"access_token": access_token, "token_type": "bearer"}
