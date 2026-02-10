"""
API adapter router for spec-compliant endpoints.
Maps request/response shapes to internal routers.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.database import get_db
from app.routers.submissions import create_submission, get_current_user
from app.models import User, Cluster, Submission

router = APIRouter(prefix="/api", tags=["api"])


class ApiSubmissionRequest(BaseModel):
    kiosk_id: Optional[str] = "kiosk-001"
    intent: str
    text: str
    geo: Optional[Dict[str, float]] = None
    ocr: Optional[Dict[str, Any]] = None
    phone_masked: Optional[str] = None
    files: Optional[List[str]] = None


@router.post("/submissions")
async def api_create_submission(
    req: ApiSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Adapter: POST /api/submissions
    Maps to internal submission flow. Returns receipt with short_code.
    """
    submission = SubmissionCreate(
        intent=req.intent,
        text=req.text,
        latitude=req.geo.get("lat") if req.geo else None,
        longitude=req.geo.get("lng") if req.geo else None,
        ocr_parsed_data=req.ocr,
        uploaded_files=req.files,
    )
    result = await create_submission(
        submission=submission,
        kiosk_id=req.kiosk_id or "kiosk-001",
        current_user=current_user,
        db=db,
    )
    return {
        "receipt_id": result.receipt_id,
        "short_code": result.short_code,
        "receipt_hash": result.receipt_hash,
        "priority": "normal",
    }


class ClusterJoinRequest(BaseModel):
    submission_id: int


@router.post("/cluster/{cluster_id}/join")
async def cluster_join(
    cluster_id: str,
    req: ClusterJoinRequest,
    db: Session = Depends(get_db),
):
    """
    Join an existing complaint to a cluster.
    Increments citizen_count on the submission.
    """
    cluster = db.query(Cluster).filter(
        (Cluster.cluster_id == cluster_id) | (Cluster.id == int(cluster_id) if cluster_id.isdigit() else False)
    ).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    submission = db.query(Submission).filter(Submission.id == req.submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if req.submission_id not in (cluster.submission_ids or []):
        cluster.submission_ids = list(cluster.submission_ids or []) + [req.submission_id]
        cluster.size = len(cluster.submission_ids)

    count = getattr(submission, "citizen_count", 1) or 1
    submission.citizen_count = count + 1
    submission.joined_cluster = True
    submission.cluster_id = cluster.id

    if submission.citizen_count >= 5 and submission.priority == "normal":
        submission.priority = "high"
    elif submission.citizen_count >= 10 and submission.priority == "high":
        submission.priority = "urgent"

    db.commit()
    return {"success": True, "cluster_size": cluster.size}


class AdminAssignRequest(BaseModel):
    cluster_id: str
    crew_id: int
    eta_minutes: Optional[int] = None


@router.post("/admin/assign")
async def admin_assign(
    req: AdminAssignRequest,
    password: str = None,
    db: Session = Depends(get_db),
):
    """
    POST /api/admin/assign - spec-compliant dispatch.
    """
    from app.routers.admin import verify_admin_password, assign_cluster

    verify_admin_password(password)
    result = await assign_cluster(
        cluster_id=req.cluster_id,
        crew_id=req.crew_id,
        notes=f"ETA: {req.eta_minutes} min" if req.eta_minutes else None,
        password=password,
        db=db,
    )
    return {"success": True, "assigned_to": req.crew_id}
