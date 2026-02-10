from app.database import engine, Base
from app.models import PredictedEvent

# Create only the new table
PredictedEvent.__table__.create(bind=engine)
print("Created predicted_events table")
