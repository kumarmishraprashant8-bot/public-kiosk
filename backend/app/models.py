from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(15), unique=True, index=True, nullable=False)
    citizen_id_masked = Column(String(50), nullable=True)  # Masked PII
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    submissions = relationship("Submission", back_populates="user")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    intent = Column(String(50), nullable=False)  # water_outage, electricity_outage, etc.
    text = Column(Text, nullable=False)
    language = Column(String(10), default="en")  # Detected language code
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    postal_code = Column(String(10), nullable=True)
    ward = Column(String(50), nullable=True)
    uploaded_files = Column(JSON, nullable=True)  # List of file URLs/paths
    ocr_parsed_data = Column(JSON, nullable=True)  # Parsed OCR fields
    status = Column(String(20), default="pending")  # pending, assigned, resolved
    priority = Column(String(10), default="normal")  # normal, high, urgent
    citizen_count = Column(Integer, default=1)  # Number of citizens joined
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    priority_score = Column(Float, nullable=True)
    joined_cluster = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="submissions")
    receipt = relationship("Receipt", back_populates="submission", uselist=False)

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(String(36), unique=True, index=True, nullable=False)  # UUID
    short_code = Column(String(12), unique=True, index=True, nullable=True)  # For /track/{short_code}
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False, unique=True)
    receipt_hash = Column(String(64), nullable=False)  # SHA256 hex (chain_hash)
    prev_hash = Column(String(64), nullable=True)  # Previous receipt hash in chain
    chain_hash = Column(String(64), nullable=True)  # Cumulative chain hash
    kiosk_id = Column(String(50), nullable=False)  # Kiosk identifier
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    submission = relationship("Submission", back_populates="receipt")

class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(String(50), unique=True, index=True, nullable=False)
    intent = Column(String(50), nullable=False)
    submission_ids = Column(JSON, nullable=False)  # List of submission IDs
    explanation_json = Column(JSON, nullable=True)  # TF-IDF terms, excerpts, severity
    status = Column(String(20), default="open")  # open, resolved, pending
    severity_score = Column(Float, nullable=True)
    center_latitude = Column(Float, nullable=True)
    center_longitude = Column(Float, nullable=True)
    ward = Column(String(50), nullable=True)
    size = Column(Integer, default=0)
    priority = Column(String(10), default="normal")
    escalated = Column(Boolean, default=False)
    # SLA fields
    sla_target_hours = Column(Float, nullable=True)  # Target SLA in hours
    sla_deadline = Column(DateTime(timezone=True), nullable=True)
    sla_breached = Column(Boolean, default=False)
    # Assignment fields
    assigned_crew_id = Column(Integer, ForeignKey("crews.id"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    # Cost tracking
    cost_estimate = Column(Float, default=0.0)  # Cost-of-delay metric
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    assigned_crew = relationship("Crew", back_populates="assigned_clusters")
    thread = relationship("Thread", back_populates="cluster", uselist=False)


class Crew(Base):
    """Field crew for task assignment"""
    __tablename__ = "crews"

    id = Column(Integer, primary_key=True, index=True)
    crew_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), nullable=True)
    specialty = Column(String(50), nullable=True)  # water, electricity, road, etc.
    zone = Column(String(50), nullable=True)
    capacity = Column(Integer, default=1)
    current_status = Column(String(20), default="available")  # available, enroute, onsite, busy
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    photo_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    assigned_clusters = relationship("Cluster", back_populates="assigned_crew")


class Thread(Base):
    """Two-way chat thread for a submission/cluster"""
    __tablename__ = "threads"
    
    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String(36), unique=True, index=True, nullable=False)  # UUID
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    status = Column(String(20), default="open")  # open, closed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    messages = relationship("Message", back_populates="thread", order_by="Message.created_at")
    cluster = relationship("Cluster", back_populates="thread")


class Message(Base):
    """Individual messages in a thread"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"), nullable=False)
    author_type = Column(String(20), nullable=False)  # admin, citizen, crew, system
    author_id = Column(String(50), nullable=True)  # User ID or crew ID
    author_name = Column(String(100), nullable=True)  # Display name
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # text, status_update, photo
    message_metadata = Column(JSON, nullable=True)  # Extra data (photo URL, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    thread = relationship("Thread", back_populates="messages")


class AuditLog(Base):
    """Audit trail for all admin actions"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(50), nullable=False)  # assign, dispatch, resolve, update, etc.
    actor_type = Column(String(20), nullable=False)  # admin, crew, system
    actor_id = Column(String(50), nullable=True)
    resource_type = Column(String(50), nullable=False)  # cluster, submission, crew
    resource_id = Column(String(50), nullable=False)
    details = Column(JSON, nullable=True)  # Action details
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KioskLog(Base):
    __tablename__ = "kiosk_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    kiosk_id = Column(String(50), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # submission, sync, error
    message = Column(Text, nullable=True)
    log_metadata = Column(JSON, nullable=True)  # 'metadata' is reserved by SQLAlchemy
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OTP(Base):
    __tablename__ = "otps"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(15), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PredictedEvent(Base):
    """AI-predicted events (Psychic Intercept)"""
    __tablename__ = "predicted_events"

    id = Column(Integer, primary_key=True, index=True)
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    predicted_intent = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    status = Column(String(20), default="predicted")  # predicted, confirmed, resolved, false_positive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    sample_submissions = Column(JSON, nullable=True)  # Snapshot of submissions triggering this
    
    # New confirmed submissions can be linked here
    confirmed_submissions = relationship("Submission", back_populates="predicted_event")

# Add back_populates to Submission
Submission.predicted_event = relationship("PredictedEvent", back_populates="confirmed_submissions")
Submission.predicted_event_id = Column(Integer, ForeignKey("predicted_events.id"), nullable=True)
