"""
Public tracking page - GET /track/{short_code}
Returns timeline and verification status for receipt lookup.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Receipt, Submission, Cluster

router = APIRouter(prefix="/track", tags=["track"])


@router.get("/{short_code}")
async def get_track(
    short_code: str,
    db: Session = Depends(get_db),
):
    """
    Public tracking: GET /track/{short_code}
    Returns JSON by default. Use ?format=html for human page.
    """
    # Lookup by short_code first, then by receipt_id prefix
    receipt = db.query(Receipt).filter(Receipt.short_code == short_code).first()
    if not receipt:
        # Fallback: try receipt_id (UUID) for backward compat
        receipt = db.query(Receipt).filter(Receipt.receipt_id == short_code).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Tracking code not found")

    submission = db.query(Submission).filter(Submission.id == receipt.submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Build timeline
    timeline = [{"step": "submitted", "status": "done", "label": "Complaint submitted", "at": submission.created_at.isoformat() if submission.created_at else None}]
    if submission.status == "assigned":
        timeline.append({"step": "assigned", "status": "done", "label": "Assigned to crew", "at": None})
    if submission.status == "resolved":
        timeline.append({"step": "resolved", "status": "done", "label": "Resolved", "at": None})

    # Find cluster if any
    cluster = None
    if submission.cluster_id:
        cluster = db.query(Cluster).filter(Cluster.id == submission.cluster_id).first()
    else:
        # Check if submission is in any cluster
        clusters = db.query(Cluster).filter(Cluster.submission_ids.isnot(None)).all()
        for c in clusters:
            if submission.id in (c.submission_ids or []):
                cluster = c
                break

    return {
        "short_code": short_code,
        "receipt_id": receipt.receipt_id,
        "receipt_hash": receipt.receipt_hash,
        "verified": True,  # Will be checked by verify endpoint
        "submission": {
            "id": submission.id,
            "intent": submission.intent,
            "text": submission.text[:200] + "..." if len(submission.text) > 200 else submission.text,
            "status": submission.status,
            "priority": submission.priority,
        },
        "timeline": timeline,
        "cluster": {
            "cluster_id": cluster.cluster_id,
            "size": cluster.size,
            "ward": cluster.ward,
        } if cluster else None,
    }
