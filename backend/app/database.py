from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Use SQLite if no DATABASE_URL (no Docker / no PostgreSQL needed)
# Use SQLite if no DATABASE_URL (no Docker / no PostgreSQL needed)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Use absolute path to ensure we always write to the same file
    # regardless of where the script is run from
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DB_PATH = os.path.join(BASE_DIR, "civicpulse.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
