#!/usr/bin/env python3
"""
Seed script for CivicPulse demo data.
Creates sample utility bills, simulated complaints, and test users.
Run with: python scripts/seed_data.py
"""
import sys
import os
from datetime import datetime, timedelta
import random
import json

# Add backend to path (works from root or backend directory)
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(script_dir, "..", "backend")
if os.path.exists(backend_dir):
    sys.path.insert(0, backend_dir)
# Also try current directory (if running from backend/)
if os.path.exists("app"):
    sys.path.insert(0, os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import User, Submission, Receipt, Cluster, OTP
from app.receipt import compute_receipt_hash, generate_receipt_id
from app.intent_classifier import INTENT_KEYWORDS

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://civicpulse:civicpulse_dev@localhost:5432/civicpulse")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Sample data
SAMPLE_NAMES = [
    "PRASH** K**", "RAJ** S**", "PRIYA** M**", "AMIT** K**",
    "SUNITA** D**", "VIJAY** R**", "KAVITA** P**", "RAHUL** S**"
]

SAMPLE_ADDRESSES = [
    "123 MG Road, Bangalore", "456 Indira Nagar, Bangalore",
    "789 Koramangala, Bangalore", "321 Whitefield, Bangalore",
    "654 Jayanagar, Bangalore", "987 Malleswaram, Bangalore"
]

SAMPLE_BILLERS = ["BESCOM", "BWSSB", "BMC", "DELHI WATER BOARD"]

# Geo coordinates for Bangalore area
BANGALORE_CENTER = (12.9716, 77.5946)
WARD_NAMES = ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5"]

def generate_random_coords(center, radius_km=5):
    """Generate random coordinates within radius of center"""
    import random
    lat, lng = center
    # Rough conversion: 1 degree ≈ 111 km
    lat_offset = random.uniform(-radius_km/111, radius_km/111)
    lng_offset = random.uniform(-radius_km/111, radius_km/111)
    return lat + lat_offset, lng + lng_offset

def create_sample_users(db):
    """Create sample users"""
    phones = ["+919876543210", "+919876543211", "+919876543212", "+919876543213"]
    users = []
    for phone in phones:
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            user = User(phone=phone, citizen_id_masked=f"XXXX{random.randint(1000, 9999)}")
            db.add(user)
            users.append(user)
        else:
            users.append(user)
    db.commit()
    return users

def create_sample_submissions(db, users):
    """Create 200 simulated complaints"""
    intents = list(INTENT_KEYWORDS.keys())
    intents.remove("other")
    
    complaints = [
        "No water supply for 3 days",
        "Water pipeline leakage",
        "Electricity outage since morning",
        "Power cut for 2 hours",
        "Garbage not collected",
        "Dustbin overflowing",
        "Road has potholes",
        "Street light not working",
        "Sewage overflow",
        "Drain blocked",
    ]
    
    submissions = []
    kiosk_id = "kiosk-001"
    prev_hash = None
    
    for i in range(200):
        user = random.choice(users)
        intent = random.choice(intents)
        text = random.choice(complaints) + f" in area {random.randint(1, 10)}"
        
        # Generate random coordinates
        lat, lng = generate_random_coords(BANGALORE_CENTER, radius_km=10)
        ward = random.choice(WARD_NAMES)
        postal_code = f"5600{random.randint(10, 99)}"
        
        # Random time within last 7 days
        created_at = datetime.utcnow() - timedelta(
            days=random.randint(0, 7),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        
        submission = Submission(
            user_id=user.id,
            intent=intent,
            text=text,
            latitude=lat,
            longitude=lng,
            postal_code=postal_code,
            ward=ward,
            status=random.choice(["pending", "assigned", "resolved"]),
            priority=random.choice(["normal", "high", "urgent"]),
            created_at=created_at
        )
        db.add(submission)
        db.flush()
        
        # Create receipt with hash chain
        submission_json = {
            "id": submission.id,
            "intent": submission.intent,
            "text": submission.text,
            "created_at": submission.created_at.isoformat()
        }
        
        receipt_hash = compute_receipt_hash(submission_json, prev_hash)
        receipt_id = generate_receipt_id()
        
        receipt = Receipt(
            receipt_id=receipt_id,
            submission_id=submission.id,
            receipt_hash=receipt_hash,
            prev_hash=prev_hash,
            kiosk_id=kiosk_id,
            created_at=created_at
        )
        db.add(receipt)
        
        prev_hash = receipt_hash
        submissions.append(submission)
    
    db.commit()
    print(f"Created {len(submissions)} sample submissions")
    return submissions

def create_sample_ocr_data():
    """Generate sample OCR parsed data for utility bills"""
    ocr_samples = []
    for i in range(50):
        name = random.choice(SAMPLE_NAMES)
        account_no = f"ACC{random.randint(100000, 999999)}"
        address = random.choice(SAMPLE_ADDRESSES)
        biller = random.choice(SAMPLE_BILLERS)
        amount = f"₹{random.randint(500, 5000)}.{random.randint(10, 99)}"
        date = (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%d/%m/%Y")
        
        ocr_samples.append({
            "name": name,
            "account_no": account_no,
            "address": address,
            "biller": biller,
            "amount": amount,
            "date": date,
            "raw_text": f"BILL FROM {biller}\nNAME: {name}\nACCOUNT: {account_no}\nADDRESS: {address}\nAMOUNT: {amount}\nDATE: {date}",
            "confidence": random.uniform(0.7, 0.95)
        })
    return ocr_samples

def main():
    print("Starting seed data generation...")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Create users
        print("Creating sample users...")
        users = create_sample_users(db)
        print(f"Created {len(users)} users")
        
        # Create submissions
        print("Creating sample submissions...")
        submissions = create_sample_submissions(db, users)
        
        # Create sample OCR data (for reference, not stored in DB)
        print("Generated 50 sample OCR data entries")
        ocr_samples = create_sample_ocr_data()
        
        # Save OCR samples to JSON file for reference
        with open("scripts/sample_ocr_data.json", "w") as f:
            json.dump(ocr_samples, f, indent=2)
        print("Saved sample OCR data to scripts/sample_ocr_data.json")
        
        print("\n✅ Seed data generation complete!")
        print(f"   - Users: {len(users)}")
        print(f"   - Submissions: {len(submissions)}")
        print(f"   - OCR Samples: {len(ocr_samples)}")
        print("\n💡 To test OCR, use images of utility bills or reference the sample_ocr_data.json file")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
