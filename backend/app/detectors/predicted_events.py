from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Submission, PredictedEvent
from app.database import SessionLocal

# Grid size for detection (approx 200m)
GRID_PRECISION = 3  # Decimal places for lat/lng rounding

def detect_predicted_events(db: Session):
    """
    Run anomaly detection on recent submissions to predict events.
    Simple algorithm: High concentration of 'pending' submissions in a small area.
    """
    # Group pending submissions by location (rounded lat/lng)
    results = db.query(
        func.round(Submission.latitude, GRID_PRECISION).label('lat'),
        func.round(Submission.longitude, GRID_PRECISION).label('lng'),
        Submission.intent,
        func.count(Submission.id).label('count')
    ).filter(
        Submission.status == 'pending',
        Submission.predicted_event_id.is_(None) # Not already linked
    ).group_by(
        func.round(Submission.latitude, GRID_PRECISION),
        func.round(Submission.longitude, GRID_PRECISION),
        Submission.intent
    ).having(func.count(Submission.id) >= 3).all() # Threshold: 3 reports

    new_events = []
    for row in results:
        # Check if active predicted event already exists nearby
        existing = db.query(PredictedEvent).filter(
            func.round(PredictedEvent.center_lat, GRID_PRECISION) == row.lat,
            func.round(PredictedEvent.center_lng, GRID_PRECISION) == row.lng,
            PredictedEvent.predicted_intent == row.intent,
            PredictedEvent.status.in_(['predicted', 'confirmed'])
        ).first()

        if not existing:
            # Create new prediction
            event = PredictedEvent(
                center_lat=row.lat,
                center_lng=row.lng,
                predicted_intent=row.intent,
                confidence=min(0.5 + (row.count * 0.1), 0.95), # Cap at 0.95
                status='predicted'
            )
            db.add(event)
            new_events.append(event)
    
    db.commit()
    return new_events
