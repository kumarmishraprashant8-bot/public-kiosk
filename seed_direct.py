#!/usr/bin/env python3
"""Direct seeder script that bypasses the API to add demo data."""
import sys
import os
import random
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import Base, engine, SessionLocal
from app.models import User, Submission, Receipt, Cluster, Crew
from app.receipt import compute_receipt_hash, generate_receipt_id, generate_short_code

# Create all tables
Base.metadata.create_all(bind=engine)

# Ward centers for Bangalore demo data
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
    'water_outage': ['No water supply since morning', 'Water pipeline leakage on main road', 'Low water pressure in entire area', 'Contaminated water from taps'],
    'electricity_outage': ['Power cut for 4 hours', 'Frequent voltage fluctuations', 'Transformer sparking near junction', 'Street lights not working for 3 days'],
    'garbage': ['Garbage not collected for a week', 'Overflowing dustbin near school', 'Illegal dumping of construction waste', 'Foul smell from garbage pile'],
    'road': ['Large pothole causing accidents', 'Road completely damaged after rain', 'Missing manhole cover dangerously open', 'Speed breaker too high'],
    'sewage': ['Sewage overflowing on main road', 'Drain blocked causing waterlogging', 'Foul smell from drainage', 'Open drain near residential area'],
    'streetlight': ['Street light not working', 'Entire street without lights', 'Light pole damaged and leaning', 'Lights flickering all night'],
}

def generate_random_location(ward_name):
    center_lat, center_lng = WARD_CENTERS[ward_name]
    lat = center_lat + random.uniform(-0.01, 0.01)
    lng = center_lng + random.uniform(-0.01, 0.01)
    return (lat, lng)

db = SessionLocal()

print("\n[SEED] CivicPulse Direct Seeder")
print("=" * 40)

# Get or create demo user
demo_user = db.query(User).filter(User.phone == "+91-demo-user").first()
if not demo_user:
    demo_user = User(phone="+91-demo-user", citizen_id_masked="DEMO***USER")
    db.add(demo_user)
    db.flush()
    print("[OK] Created demo user")
else:
    print("[OK] Using existing demo user")

now = datetime.utcnow()
two_hours_ago = now - timedelta(hours=2)
created_submissions = []
wards = list(WARD_CENTERS.keys())

# Create emergent clusters
cluster_configs = [
    ('Koramangala', 'water_outage', 7),
    ('Whitefield', 'electricity_outage', 6),
    ('BTM Layout', 'garbage', 5),
]

for ward, intent, cluster_size in cluster_configs:
    cluster_time = now - timedelta(minutes=random.randint(15, 45))
    center_lat, center_lng = generate_random_location(ward)
    
    for i in range(cluster_size):
        lat = center_lat + random.uniform(-0.003, 0.003)
        lng = center_lng + random.uniform(-0.003, 0.003)
        timestamp = cluster_time + timedelta(minutes=random.randint(0, 20))
        
        submission = Submission(
            user_id=demo_user.id,
            intent=intent,
            text=random.choice(SAMPLE_TEXTS[intent]),
            latitude=lat,
            longitude=lng,
            ward=ward,
            status='pending',
            priority='high' if i < cluster_size // 2 else 'urgent',
            created_at=timestamp
        )
        db.add(submission)
        created_submissions.append(submission)

# Fill remaining with random submissions
count = 200
remaining = count - len(created_submissions)

for _ in range(remaining):
    ward = random.choice(wards)
    intent = random.choice(INTENT_TYPES)
    lat, lng = generate_random_location(ward)
    timestamp = two_hours_ago + timedelta(minutes=random.randint(0, 120))
    
    submission = Submission(
        user_id=demo_user.id,
        intent=intent,
        text=random.choice(SAMPLE_TEXTS[intent]),
        latitude=lat,
        longitude=lng,
        ward=ward,
        status=random.choices(STATUSES, weights=[0.6, 0.25, 0.15])[0],
        priority=random.choices(PRIORITIES, weights=[0.6, 0.3, 0.1])[0],
        created_at=timestamp
    )
    db.add(submission)
    created_submissions.append(submission)

db.flush()
print(f"[OK] Created {len(created_submissions)} submissions")

# Create receipts
prev_hash = None
for submission in created_submissions:
    receipt_id = generate_receipt_id()
    short_code = generate_short_code()
    submission_json = {"id": submission.id, "intent": submission.intent, "text": submission.text}
    receipt_hash = compute_receipt_hash(submission_json, prev_hash)
    
    receipt = Receipt(
        receipt_id=receipt_id,
        short_code=short_code,
        submission_id=submission.id,
        receipt_hash=receipt_hash,
        prev_hash=prev_hash,
        kiosk_id="demo-kiosk"
    )
    db.add(receipt)
    prev_hash = receipt_hash

print(f"[OK] Created {len(created_submissions)} receipts")

# Seed crews
demo_crews_data = [
    {"name": "Crew Alpha", "specialty": "water", "zone": "Koramangala", "capacity": 5},
    {"name": "Crew Beta", "specialty": "electricity", "zone": "Whitefield", "capacity": 4},
    {"name": "Crew Gamma", "specialty": "garbage", "zone": "BTM Layout", "capacity": 3},
    {"name": "Crew Delta", "specialty": "road", "zone": "Jayanagar", "capacity": 4},
    {"name": "Crew Epsilon", "specialty": "sewage", "zone": "HSR Layout", "capacity": 3},
]

crews_created = 0
for c in demo_crews_data:
    existing = db.query(Crew).filter(Crew.name == c["name"]).first()
    if not existing:
        crew = Crew(
            crew_id=f"crew-{c['name'].lower().replace(' ', '-')}",
            name=c["name"],
            specialty=c["specialty"],
            zone=c.get("zone"),
            capacity=c.get("capacity", 1),
            current_status="available",
        )
        db.add(crew)
        crews_created += 1

print(f"[OK] Created {crews_created} crews")

db.commit()

# Run clustering
print("\n[INFO] Running clustering...")
from app.clustering import clustering_service
clusters = clustering_service.cluster_submissions(db, window_minutes=120)
clustering_service.save_clusters(db, clusters)
print(f"[OK] Created {len(clusters)} clusters")

db.close()

print("\n" + "=" * 40)
print("[SUCCESS] Demo data seeded successfully!")
print(f"   Submissions: {len(created_submissions)}")
print(f"   Clusters: {len(clusters)}")
print(f"   Crews: {crews_created}")
print("\nRefresh the Admin Dashboard to see the data!")

