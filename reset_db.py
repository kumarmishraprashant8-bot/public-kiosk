#!/usr/bin/env python3
"""Reset and reseed the CivicPulse database. Run this with backend STOPPED."""
import os
import sys
import random
from datetime import datetime, timedelta

# Add backend to path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

db_path = os.path.join(backend_dir, 'civicpulse.db')
print(f"[INFO] Database path: {db_path}")

# Step 1: Delete old database if exists
if os.path.exists(db_path):
    try:
        os.remove(db_path)
        print(f"[OK] Deleted old database")
    except PermissionError:
        print("[ERROR] Cannot delete database - backend is still using it!")
        print("Stop the backend first (Ctrl+C), then run this script again.")
        sys.exit(1)

# Step 2: Import and create fresh schema
from app.database import Base, engine, SessionLocal
from app.models import User, Submission, Receipt, Cluster, Crew
from app.receipt import compute_receipt_hash, generate_receipt_id, generate_short_code

print("[INFO] Creating fresh database...")
Base.metadata.create_all(bind=engine)

# Step 3: Seed data
db = SessionLocal()

WARD_CENTERS = {
    'Koramangala': (12.9352, 77.6245),
    'Indiranagar': (12.9784, 77.6408),
    'Whitefield': (12.9698, 77.7499),
    'Jayanagar': (12.9308, 77.5838),
    'BTM Layout': (12.9166, 77.6101),
    'HSR Layout': (12.9121, 77.6446),
    'Electronic City': (12.8456, 77.6603),
    'Malleshwaram': (13.0035, 77.5645),
}

INTENT_TYPES = ['water_outage', 'electricity_outage', 'garbage', 'road', 'sewage', 'streetlight']
STATUSES = ['pending', 'assigned', 'resolved']
PRIORITIES = ['normal', 'high', 'urgent']

SAMPLE_TEXTS = {
    'water_outage': ['No water supply since morning', 'Water pipeline leakage on main road', 'Low water pressure in entire area'],
    'electricity_outage': ['Power cut for 4 hours', 'Frequent voltage fluctuations', 'Transformer sparking near junction'],
    'garbage': ['Garbage not collected for a week', 'Overflowing dustbin near school', 'Foul smell from garbage pile'],
    'road': ['Large pothole causing accidents', 'Road completely damaged after rain', 'Missing manhole cover'],
    'sewage': ['Sewage overflowing on main road', 'Drain blocked causing waterlogging', 'Foul smell from drainage'],
    'streetlight': ['Street light not working', 'Entire street without lights', 'Light pole damaged and leaning'],
}

def random_location(ward):
    lat, lng = WARD_CENTERS[ward]
    return (lat + random.uniform(-0.01, 0.01), lng + random.uniform(-0.01, 0.01))

# Create demo user
demo_user = User(phone="+91-demo-user", citizen_id_masked="DEMO***USER")
db.add(demo_user)
db.flush()

now = datetime.now()
submissions = []

# Emergent clusters (grouped complaints)
for ward, intent, size in [('Koramangala', 'water_outage', 7), ('Whitefield', 'electricity_outage', 6), ('BTM Layout', 'garbage', 5)]:
    cluster_time = now - timedelta(minutes=random.randint(15, 45))
    base_lat, base_lng = random_location(ward)
    for i in range(size):
        s = Submission(
            user_id=demo_user.id, intent=intent, text=random.choice(SAMPLE_TEXTS[intent]),
            latitude=base_lat + random.uniform(-0.003, 0.003), longitude=base_lng + random.uniform(-0.003, 0.003),
            ward=ward, status='pending', priority='high' if i < size//2 else 'urgent',
            created_at=cluster_time + timedelta(minutes=random.randint(0, 20))
        )
        db.add(s)
        submissions.append(s)

# Random submissions
for _ in range(200 - len(submissions)):
    ward = random.choice(list(WARD_CENTERS.keys()))
    lat, lng = random_location(ward)
    s = Submission(
        user_id=demo_user.id, intent=random.choice(INTENT_TYPES), text=random.choice(SAMPLE_TEXTS[random.choice(INTENT_TYPES)]),
        latitude=lat, longitude=lng, ward=ward,
        status=random.choices(STATUSES, weights=[0.6, 0.25, 0.15])[0],
        priority=random.choices(PRIORITIES, weights=[0.6, 0.3, 0.1])[0],
        created_at=now - timedelta(minutes=random.randint(0, 120))
    )
    db.add(s)
    submissions.append(s)

db.flush()
print(f"[OK] Created {len(submissions)} submissions")

# Create receipts
prev_hash = None
for s in submissions:
    h = compute_receipt_hash({"id": s.id, "intent": s.intent, "text": s.text}, prev_hash)
    db.add(Receipt(receipt_id=generate_receipt_id(), short_code=generate_short_code(), submission_id=s.id, receipt_hash=h, prev_hash=prev_hash, kiosk_id="demo"))
    prev_hash = h
print(f"[OK] Created {len(submissions)} receipts")

# Create crews
for c in [("Alpha", "water", "Koramangala"), ("Beta", "electricity", "Whitefield"), ("Gamma", "garbage", "BTM Layout"), ("Delta", "road", "Jayanagar"), ("Epsilon", "sewage", "HSR Layout")]:
    db.add(Crew(crew_id=f"crew-{c[0].lower()}", name=f"Crew {c[0]}", specialty=c[1], zone=c[2], capacity=4, current_status="available"))
print("[OK] Created 5 crews")

db.commit()

# Run clustering
from app.clustering import clustering_service
clusters = clustering_service.cluster_submissions(db, window_minutes=120)
clustering_service.save_clusters(db, clusters)
print(f"[OK] Created {len(clusters)} clusters")

db.close()
print("\n" + "="*50)
print("SUCCESS! Now start the backend:")
print("  cd backend")
print("  python -m uvicorn app.main:app --reload --port 8000")
print("Then open http://localhost:3001")
print("="*50)
