"""
Crew router for field crew management and status updates.
Implements the Field Crew Mobile App backend.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import get_db
from app.models import Crew, Cluster, Thread, Message, AuditLog
from app.schemas import CrewCreate, CrewResponse, CrewStatusUpdate
from app.config import settings

router = APIRouter(prefix="/crews", tags=["crews"])


def create_audit_log(db: Session, action: str, resource_type: str, resource_id: str, 
                     actor_type: str = "crew", details: dict = None):
    """Helper to create audit log entries."""
    audit = AuditLog(
        action=action,
        actor_type=actor_type,
        resource_type=resource_type,
        resource_id=str(resource_id),
        details=details or {},
    )
    db.add(audit)
    db.flush()


@router.get("", response_model=List[CrewResponse])
async def list_crews(
    status: Optional[str] = None,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all field crews.
    Optionally filter by status or specialty.
    """
    query = db.query(Crew)
    
    if status:
        query = query.filter(Crew.current_status == status)
    if specialty:
        query = query.filter(Crew.specialty == specialty)
    
    crews = query.order_by(Crew.name).all()
    return crews


@router.post("", response_model=CrewResponse)
async def create_crew(
    crew_data: CrewCreate,
    password: str = None,
    db: Session = Depends(get_db)
):
    """Create a new field crew member."""
    crew = Crew(
        crew_id=str(uuid.uuid4())[:8].upper(),
        name=crew_data.name,
        phone=crew_data.phone,
        specialty=crew_data.specialty,
        current_latitude=crew_data.current_latitude,
        current_longitude=crew_data.current_longitude,
        current_status="available",
    )
    db.add(crew)
    
    create_audit_log(db, "create_crew", "crew", crew.crew_id, "admin", {"name": crew.name})
    
    db.commit()
    db.refresh(crew)
    
    return crew


@router.get("/{crew_id}", response_model=CrewResponse)
async def get_crew(
    crew_id: str,
    db: Session = Depends(get_db)
):
    """Get crew details by ID."""
    crew = db.query(Crew).filter(
        (Crew.crew_id == crew_id) | (Crew.id == int(crew_id) if crew_id.isdigit() else False)
    ).first()
    
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    return crew


@router.post("/{crew_id}/status", response_model=CrewResponse)
async def update_crew_status(
    crew_id: str,
    status_update: CrewStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Update crew status from field.
    Used by crew mobile app to report: enroute, onsite, resolved.
    """
    crew = db.query(Crew).filter(
        (Crew.crew_id == crew_id) | (Crew.id == int(crew_id) if crew_id.isdigit() else False)
    ).first()
    
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    old_status = crew.current_status
    crew.current_status = status_update.status
    crew.updated_at = datetime.utcnow()
    
    if status_update.latitude:
        crew.current_latitude = status_update.latitude
    if status_update.longitude:
        crew.current_longitude = status_update.longitude
    if status_update.photo_url:
        crew.photo_url = status_update.photo_url
    
    # If crew resolved, update assigned clusters
    if status_update.status == "resolved":
        assigned_clusters = db.query(Cluster).filter(
            Cluster.assigned_crew_id == crew.id,
            Cluster.resolved_at.is_(None)
        ).all()
        
        for cluster in assigned_clusters:
            cluster.resolved_at = datetime.utcnow()
            cluster.sla_breached = False  # Clear breach if resolved
            
            # Add resolution message to thread
            thread = db.query(Thread).filter(Thread.cluster_id == cluster.id).first()
            if thread:
                resolution_msg = Message(
                    thread_id=thread.id,
                    author_type="crew",
                    author_id=crew.crew_id,
                    author_name=crew.name,
                    content=f"Issue resolved. {status_update.notes or 'Work completed.'}",
                    message_type="status_update",
                    message_metadata={"photo_url": status_update.photo_url} if status_update.photo_url else None,
                )
                db.add(resolution_msg)
    
    # If enroute or onsite, add status update to threads
    elif status_update.status in ["enroute", "onsite"]:
        assigned_clusters = db.query(Cluster).filter(
            Cluster.assigned_crew_id == crew.id
        ).all()
        
        status_messages = {
            "enroute": f"Crew {crew.name} is on the way to the location.",
            "onsite": f"Crew {crew.name} has arrived at the location and is working on the issue.",
        }
        
        for cluster in assigned_clusters:
            thread = db.query(Thread).filter(Thread.cluster_id == cluster.id).first()
            if thread:
                status_msg = Message(
                    thread_id=thread.id,
                    author_type="crew",
                    author_id=crew.crew_id,
                    author_name=crew.name,
                    content=status_messages.get(status_update.status, f"Status: {status_update.status}"),
                    message_type="status_update",
                )
                db.add(status_msg)
    
    # Audit log
    create_audit_log(
        db, "status_update", "crew", crew.crew_id, "crew",
        {"old_status": old_status, "new_status": status_update.status, "notes": status_update.notes}
    )
    
    db.commit()
    db.refresh(crew)
    
    return crew


@router.get("/{crew_id}/assignments")
async def get_crew_assignments(
    crew_id: str,
    db: Session = Depends(get_db)
):
    """Get current assignments for a crew member."""
    crew = db.query(Crew).filter(
        (Crew.crew_id == crew_id) | (Crew.id == int(crew_id) if crew_id.isdigit() else False)
    ).first()
    
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    # Get assigned clusters that are not resolved
    clusters = db.query(Cluster).filter(
        Cluster.assigned_crew_id == crew.id,
        Cluster.resolved_at.is_(None)
    ).all()
    
    assignments = []
    for cluster in clusters:
        assignments.append({
            "cluster_id": cluster.cluster_id,
            "intent": cluster.intent,
            "ward": cluster.ward,
            "size": cluster.size,
            "priority": cluster.priority,
            "latitude": cluster.center_latitude,
            "longitude": cluster.center_longitude,
            "assigned_at": cluster.assigned_at.isoformat() if cluster.assigned_at else None,
            "sla_deadline": cluster.sla_deadline.isoformat() if cluster.sla_deadline else None,
        })
    
    return {
        "crew_id": crew.crew_id,
        "crew_name": crew.name,
        "current_status": crew.current_status,
        "assignments": assignments,
        "assignment_count": len(assignments),
    }


@router.post("/seed")
async def seed_crews(
    password: str = None,
    db: Session = Depends(get_db)
):
    """Seed demo crew data."""
    demo_crews = [
        {"name": "Ramesh Kumar", "specialty": "water", "phone": "+91-98765***01"},
        {"name": "Suresh Patel", "specialty": "electricity", "phone": "+91-98765***02"},
        {"name": "Vijay Singh", "specialty": "road", "phone": "+91-98765***03"},
        {"name": "Amit Sharma", "specialty": "sewage", "phone": "+91-98765***04"},
        {"name": "Prakash Rao", "specialty": "garbage", "phone": "+91-98765***05"},
        {"name": "Ganesh Reddy", "specialty": "streetlight", "phone": "+91-98765***06"},
    ]
    
    # Bangalore ward centers for random placement
    locations = [
        (12.9352, 77.6245),  # Koramangala
        (12.9784, 77.6408),  # Indiranagar
        (12.9698, 77.7499),  # Whitefield
        (12.9308, 77.5838),  # Jayanagar
    ]
    
    created = []
    for i, crew_data in enumerate(demo_crews):
        existing = db.query(Crew).filter(Crew.name == crew_data["name"]).first()
        if existing:
            continue
        
        lat, lng = locations[i % len(locations)]
        crew = Crew(
            crew_id=str(uuid.uuid4())[:8].upper(),
            name=crew_data["name"],
            phone=crew_data["phone"],
            specialty=crew_data["specialty"],
            current_status="available",
            current_latitude=lat + (i * 0.005),
            current_longitude=lng + (i * 0.005),
        )
        db.add(crew)
        created.append(crew.name)
    
    db.commit()
    
    return {
        "message": f"Seeded {len(created)} crews",
        "crews_created": created,
    }
