#!/usr/bin/env python3
"""
Demo Seed Script for CivicPulse Admin Dashboard
Generates 200 simulated submissions across 6-8 wards with emergent clusters.
"""

import sys
import os
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
except ImportError:
    print("Error: SQLAlchemy not installed. Run: pip install sqlalchemy")
    sys.exit(1)

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./civic_pulse.db')
NUM_SUBMISSIONS = 200
NUM_WARDS = 8

# Ward centers (Bangalore area)
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

INTENT_TYPES = [
    'water_outage',
    'electricity_outage',
    'garbage',
    'road',
    'sewage',
    'streetlight',
]

STATUSES = ['pending', 'assigned', 'resolved']
PRIORITIES = ['normal', 'high', 'urgent']

SAMPLE_TEXTS = {
    'water_outage': [
        'No water supply since morning',
        'Water pipeline leakage on main road',
        'Low water pressure in entire area',
        'Contaminated water coming from taps',
    ],
    'electricity_outage': [
        'Power cut for 4 hours',
        'Frequent voltage fluctuations',
        'Transformer sparking near junction',
        'Street lights not working since 3 days',
    ],
    'garbage': [
        'Garbage not collected for a week',
        'Overflowing dustbin near school',
        'Illegal dumping of construction waste',
        'Dead animal carcass on road',
    ],
    'road': [
        'Large pothole causing accidents',
        'Road completely damaged after rain',
        'Missing manhole cover dangerously open',
        'Speed breaker too high',
    ],
    'sewage': [
        'Sewage overflowing on main road',
        'Drain blocked causing waterlogging',
        'Foul smell from drainage',
        'Open drain near residential area',
    ],
    'streetlight': [
        'Street light not working',
        'Entire street without lights',
        'Light pole damaged and leaning',
        'Lights flickering all night',
    ],
}


def generate_random_phone() -> str:
    """Generate random Indian phone number."""
    return f'+91{random.randint(7000000000, 9999999999)}'


def generate_random_location(ward_name: str) -> tuple:
    """Generate random location within a ward (small jitter from center)."""
    center_lat, center_lng = WARD_CENTERS[ward_name]
    lat = center_lat + random.uniform(-0.01, 0.01)
    lng = center_lng + random.uniform(-0.01, 0.01)
    return (lat, lng)


def create_cluster_burst(ward_name: str, intent: str, count: int, base_time: datetime) -> List[Dict[str, Any]]:
    """Create a burst of submissions (emergent cluster) in one area."""
    submissions = []
    center_lat, center_lng = generate_random_location(ward_name)
    
    for i in range(count):
        lat = center_lat + random.uniform(-0.003, 0.003)
        lng = center_lng + random.uniform(-0.003, 0.003)
        timestamp = base_time + timedelta(minutes=random.randint(0, 20))
        
        submissions.append({
            'phone': generate_random_phone(),
            'intent': intent,
            'text': random.choice(SAMPLE_TEXTS[intent]),
            'latitude': lat,
            'longitude': lng,
            'ward': ward_name,
            'status': 'pending',
            'priority': 'high' if i < count // 2 else 'urgent',
            'created_at': timestamp,
        })
    
    return submissions


def generate_demo_submissions() -> List[Dict[str, Any]]:
    """Generate all demo submissions."""
    now = datetime.now()
    two_hours_ago = now - timedelta(hours=2)
    
    submissions = []
    
    # Create 2-3 emergent clusters (5+ submissions in 20 minutes)
    # Cluster 1: Water outage in Koramangala
    cluster_time_1 = now - timedelta(minutes=random.randint(30, 60))
    submissions.extend(create_cluster_burst('Koramangala', 'water_outage', 7, cluster_time_1))
    
    # Cluster 2: Electricity in Whitefield
    cluster_time_2 = now - timedelta(minutes=random.randint(15, 45))
    submissions.extend(create_cluster_burst('Whitefield', 'electricity_outage', 6, cluster_time_2))
    
    # Cluster 3: Garbage in BTM Layout
    cluster_time_3 = now - timedelta(minutes=random.randint(40, 90))
    submissions.extend(create_cluster_burst('BTM Layout', 'garbage', 5, cluster_time_3))
    
    # Fill remaining with random submissions
    remaining = NUM_SUBMISSIONS - len(submissions)
    wards = list(WARD_CENTERS.keys())
    
    for _ in range(remaining):
        ward = random.choice(wards)
        intent = random.choice(INTENT_TYPES)
        lat, lng = generate_random_location(ward)
        timestamp = two_hours_ago + timedelta(minutes=random.randint(0, 120))
        
        submissions.append({
            'phone': generate_random_phone(),
            'intent': intent,
            'text': random.choice(SAMPLE_TEXTS[intent]),
            'latitude': lat,
            'longitude': lng,
            'ward': ward,
            'status': random.choices(STATUSES, weights=[0.6, 0.25, 0.15])[0],
            'priority': random.choices(PRIORITIES, weights=[0.6, 0.3, 0.1])[0],
            'created_at': timestamp,
        })
    
    return submissions


def seed_database():
    """Seed the database with demo submissions."""
    print("🌱 CivicPulse Demo Seeder")
    print("=" * 40)
    
    if not os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'backend', 'app')):
        print("⚠️  Backend app not found. Running in standalone mode.")
        print("   Generating JSON file instead...")
        return seed_to_json()
    
    try:
        # Import after path setup
        from app.db import Base, engine, SessionLocal
        from app.models import Submission
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        
        # Clear existing demo data (optional)
        print("📦 Clearing existing submissions...")
        db.query(Submission).delete()
        db.commit()
        
        # Generate submissions
        print(f"📝 Generating {NUM_SUBMISSIONS} demo submissions...")
        submissions_data = generate_demo_submissions()
        
        # Insert into database
        for sub_data in submissions_data:
            submission = Submission(
                phone=sub_data['phone'],
                intent=sub_data['intent'],
                text=sub_data['text'],
                latitude=sub_data['latitude'],
                longitude=sub_data['longitude'],
                ward=sub_data['ward'],
                status=sub_data['status'],
                priority=sub_data['priority'],
            )
            db.add(submission)
        
        db.commit()
        
        # Summary
        print("\n✅ Demo data seeded successfully!")
        print(f"   Total submissions: {len(submissions_data)}")
        print(f"   Wards covered: {len(set(s['ward'] for s in submissions_data))}")
        print(f"   Intent types: {len(set(s['intent'] for s in submissions_data))}")
        print(f"   Emergent clusters: 3 (Koramangala, Whitefield, BTM Layout)")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        print("   Falling back to JSON output...")
        return seed_to_json()


def seed_to_json():
    """Output demo data as JSON file."""
    import json
    
    submissions_data = generate_demo_submissions()
    
    # Convert datetime to string
    for sub in submissions_data:
        sub['created_at'] = sub['created_at'].isoformat()
    
    output_path = os.path.join(os.path.dirname(__file__), 'demo_submissions.json')
    with open(output_path, 'w') as f:
        json.dump(submissions_data, f, indent=2)
    
    print(f"\n✅ Demo data saved to {output_path}")
    print(f"   Total submissions: {len(submissions_data)}")
    print("   Run the backend and POST to /admin/import-demo to load this data.")


if __name__ == '__main__':
    seed_database()
