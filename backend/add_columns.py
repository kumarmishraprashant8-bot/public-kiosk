from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE submissions ADD COLUMN citizen_count INTEGER DEFAULT 1"))
        print("Added citizen_count column to submissions table")
    except Exception as e:
        print(f"Error adding citizen_count: {e}")

    try:
        conn.execute(text("ALTER TABLE receipts ADD COLUMN chain_hash VARCHAR(64)"))
        print("Added chain_hash column to receipts table")
    except Exception as e:
        print(f"Error adding chain_hash: {e}")
