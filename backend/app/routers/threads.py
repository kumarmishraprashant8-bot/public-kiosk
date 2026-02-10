"""
Threading router for two-way case management communication.
Enables admin ↔ citizen chat for complaint resolution.
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid
import json
import asyncio

from app.database import get_db
from app.models import Thread, Message, Cluster, Submission, AuditLog
from app.schemas import (
    ThreadCreate, ThreadResponse, MessageCreate, MessageResponse
)
from app.config import settings

router = APIRouter(prefix="/threads", tags=["threads"])

# Store active WebSocket connections per thread
active_connections: dict[str, List[WebSocket]] = {}


def create_audit_log(db: Session, action: str, resource_type: str, resource_id: str, 
                     actor_type: str = "admin", details: dict = None):
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


@router.post("", response_model=ThreadResponse)
async def create_thread(
    thread_data: ThreadCreate,
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Create a new thread for a submission or cluster.
    Enables two-way communication between admin and citizen.
    """
    # Verify at least one reference is provided
    if not thread_data.submission_id and not thread_data.cluster_id:
        raise HTTPException(
            status_code=400, 
            detail="Must provide either submission_id or cluster_id"
        )
    
    # Check for existing thread
    existing = None
    if thread_data.cluster_id:
        existing = db.query(Thread).filter(
            Thread.cluster_id == thread_data.cluster_id
        ).first()
    elif thread_data.submission_id:
        existing = db.query(Thread).filter(
            Thread.submission_id == thread_data.submission_id
        ).first()
    
    if existing:
        # Return existing thread instead of creating duplicate
        return existing
    
    # Create new thread
    thread = Thread(
        thread_id=str(uuid.uuid4()),
        submission_id=thread_data.submission_id,
        cluster_id=thread_data.cluster_id,
        status="open",
    )
    db.add(thread)
    db.flush()
    
    # Add system message
    system_msg = Message(
        thread_id=thread.id,
        author_type="system",
        author_name="CivicPulse",
        content="Conversation started. An admin will respond shortly.",
        message_type="status_update",
    )
    db.add(system_msg)
    
    # Create audit log
    create_audit_log(
        db, "create_thread", "thread", thread.id,
        details={"cluster_id": thread_data.cluster_id, "submission_id": thread_data.submission_id}
    )
    
    db.commit()
    db.refresh(thread)
    
    return thread


@router.get("/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: str,
    db: Session = Depends(get_db)
):
    """Get thread with all messages."""
    thread = db.query(Thread).filter(
        (Thread.thread_id == thread_id) | (Thread.id == int(thread_id) if thread_id.isdigit() else False)
    ).first()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    return thread


@router.get("/by-cluster/{cluster_id}", response_model=Optional[ThreadResponse])
async def get_thread_by_cluster(
    cluster_id: int,
    db: Session = Depends(get_db)
):
    """Get thread for a specific cluster."""
    thread = db.query(Thread).filter(Thread.cluster_id == cluster_id).first()
    return thread


@router.get("/by-submission/{submission_id}", response_model=Optional[ThreadResponse])
async def get_thread_by_submission(
    submission_id: int,
    db: Session = Depends(get_db)
):
    """Get thread for a specific submission."""
    thread = db.query(Thread).filter(Thread.submission_id == submission_id).first()
    return thread


@router.post("/{thread_id}/message", response_model=MessageResponse)
async def add_message(
    thread_id: str,
    message_data: MessageCreate,
    db: Session = Depends(get_db)
):
    """
    Add a message to a thread.
    Supports admin, citizen, and crew authors.
    """
    # Find thread
    thread = db.query(Thread).filter(
        (Thread.thread_id == thread_id) | (Thread.id == int(thread_id) if thread_id.isdigit() else False)
    ).first()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    if thread.status == "closed":
        raise HTTPException(status_code=400, detail="Thread is closed")
    
    # Create message
    message = Message(
        thread_id=thread.id,
        author_type=message_data.author_type,
        author_name=message_data.author_name or message_data.author_type.capitalize(),
        content=message_data.content,
        message_type=message_data.message_type,
        message_metadata=message_data.metadata,
    )
    db.add(message)
    
    # Update thread timestamp
    thread.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    
    # Broadcast to WebSocket connections
    await broadcast_message(thread.thread_id, message)
    
    return message


@router.post("/{thread_id}/close")
async def close_thread(
    thread_id: str,
    password: str = None,
    db: Session = Depends(get_db)
):
    """Close a thread (mark conversation as complete)."""
    thread = db.query(Thread).filter(
        (Thread.thread_id == thread_id) | (Thread.id == int(thread_id) if thread_id.isdigit() else False)
    ).first()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    thread.status = "closed"
    thread.updated_at = datetime.utcnow()
    
    # Add closing message
    close_msg = Message(
        thread_id=thread.id,
        author_type="system",
        author_name="CivicPulse",
        content="This conversation has been closed.",
        message_type="status_update",
    )
    db.add(close_msg)
    
    # Create audit log
    create_audit_log(db, "close_thread", "thread", thread.id)
    
    db.commit()
    
    return {"message": "Thread closed", "thread_id": thread.thread_id}


@router.get("", response_model=List[ThreadResponse])
async def list_threads(
    status: Optional[str] = None,
    limit: int = 50,
    password: str = None,
    db: Session = Depends(get_db)
):
    """List all threads, optionally filtered by status."""
    query = db.query(Thread)
    
    if status:
        query = query.filter(Thread.status == status)
    
    threads = query.order_by(Thread.updated_at.desc()).limit(limit).all()
    return threads


# WebSocket for real-time updates
async def broadcast_message(thread_id: str, message: Message):
    """Broadcast message to all connected clients for a thread."""
    if thread_id not in active_connections:
        return
    
    message_data = {
        "id": message.id,
        "thread_id": message.thread_id,
        "author_type": message.author_type,
        "author_name": message.author_name,
        "content": message.content,
        "message_type": message.message_type,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }
    
    for connection in active_connections[thread_id]:
        try:
            await connection.send_json(message_data)
        except Exception:
            pass


@router.websocket("/ws/{thread_id}")
async def websocket_thread(websocket: WebSocket, thread_id: str):
    """WebSocket endpoint for real-time thread updates."""
    await websocket.accept()
    
    if thread_id not in active_connections:
        active_connections[thread_id] = []
    active_connections[thread_id].append(websocket)
    
    try:
        while True:
            # Keep connection alive, handle incoming messages
            data = await websocket.receive_text()
            # Could process incoming messages here if needed
    except WebSocketDisconnect:
        active_connections[thread_id].remove(websocket)
        if not active_connections[thread_id]:
            del active_connections[thread_id]
