from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# Auth Schemas
class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    code: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Submission Schemas
class SubmissionCreate(BaseModel):
    intent: str
    text: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    postal_code: Optional[str] = None
    ward: Optional[str] = None
    uploaded_files: Optional[List[str]] = None
    ocr_parsed_data: Optional[Dict[str, Any]] = None
    citizen_id_masked: Optional[str] = None

class SubmissionResponse(BaseModel):
    id: int
    intent: str
    text: str
    language: str
    status: str
    priority: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Receipt Schemas
class ReceiptResponse(BaseModel):
    receipt_id: str
    receipt_hash: str
    qr_data: str
    short_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReceiptVerifyResponse(BaseModel):
    receipt_id: str
    verification: str  # OK or FAIL
    verified: bool
    chain_position: int
    chain_length: int
    receipt_hash: str
    chain_hash: Optional[str] = None
    prev_hash: Optional[str]

    class Config:
        from_attributes = True

# OCR Schemas
class OCRParseRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None

class OCRParseResponse(BaseModel):
    name: Optional[str] = None
    account_no: Optional[str] = None
    address: Optional[str] = None
    biller: Optional[str] = None
    amount: Optional[str] = None
    date: Optional[str] = None
    raw_text: str
    confidence: float
    parsed_fields: Dict[str, Any]
    field_confidence: Optional[Dict[str, float]] = None  # Per-field confidence scores

# Cluster Schemas
class ClusterResponse(BaseModel):
    cluster_id: str
    intent: str
    submission_ids: List[int]
    center_latitude: Optional[float]
    center_longitude: Optional[float]
    ward: Optional[str]
    size: int
    priority: str
    escalated: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class HeatmapData(BaseModel):
    clusters: List[ClusterResponse]
    submissions: List[Dict[str, Any]]  # Geo points for map

# Admin Schemas
class AdminSimulateUpdate(BaseModel):
    submission_ids: List[int]
    status: str
    priority: Optional[str] = None


# Thread/Message Schemas (Two-Way Communication)
class MessageCreate(BaseModel):
    content: str
    author_type: str = "admin"  # admin, citizen, crew
    author_name: Optional[str] = None
    message_type: str = "text"  # text, status_update, photo
    metadata: Optional[Dict[str, Any]] = None


class MessageResponse(BaseModel):
    id: int
    thread_id: int
    author_type: str
    author_id: Optional[str]
    author_name: Optional[str]
    content: str
    message_type: str
    message_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ThreadCreate(BaseModel):
    submission_id: Optional[int] = None
    cluster_id: Optional[int] = None


class ThreadResponse(BaseModel):
    id: int
    thread_id: str
    submission_id: Optional[int]
    cluster_id: Optional[int]
    status: str
    messages: List[MessageResponse] = []
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Crew Schemas
class CrewCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    specialty: Optional[str] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None


class CrewStatusUpdate(BaseModel):
    status: str  # available, enroute, onsite, resolved
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None


class CrewResponse(BaseModel):
    id: int
    crew_id: str
    name: str
    phone: Optional[str]
    specialty: Optional[str]
    current_status: str
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    photo_url: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# SLA Schemas
class SLAStatus(BaseModel):
    sla_target_hours: float
    sla_deadline: str
    is_breached: bool
    hours_open: float
    time_remaining_hours: float
    status: str
    priority: str


class SLASummary(BaseModel):
    total_clusters: int
    breached: int
    at_risk: int
    on_track: int
    resolved: int
    breach_rate: float
    total_cost_incurred: float
    active_hourly_rate: float
    currency: str


class CostAnalysis(BaseModel):
    total_cost: float
    hourly_rate: float
    hours_open: float
    breakdown: Dict[str, Any]
    currency: str
    is_resolved: bool


# Cluster Assignment Schema
class ClusterAssign(BaseModel):
    crew_id: int
    notes: Optional[str] = None


# Extended Cluster Response with SLA
class ClusterDetailResponse(BaseModel):
    cluster_id: str
    intent: str
    submission_ids: List[int]
    center_latitude: Optional[float]
    center_longitude: Optional[float]
    ward: Optional[str]
    size: int
    priority: str
    escalated: bool
    sla_status: Optional[SLAStatus] = None
    cost_analysis: Optional[CostAnalysis] = None
    assigned_crew: Optional[CrewResponse] = None
    thread: Optional[ThreadResponse] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    action: str
    actor_type: str
    actor_id: Optional[str]
    resource_type: str
    resource_id: str
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogCreate(BaseModel):
    action: str
    actor_type: str
    actor_id: Optional[str] = None
    resource_type: str
    resource_id: str
    details: Optional[Dict[str, Any]] = None

