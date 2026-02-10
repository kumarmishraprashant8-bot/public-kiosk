"""
Transparency router for public data access and RTI compliance.
Provides open data APIs and exportable reports.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, Integer
from typing import Optional
from datetime import datetime, timedelta
import csv
import io
import json

from app.database import get_db
from app.models import Submission, Cluster, Crew

router = APIRouter(prefix="/transparency", tags=["transparency"])


@router.get("/open-data")
async def get_open_data(
    ward: Optional[str] = None,
    intent: Optional[str] = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Public API for anonymized civic data.
    RTI-compliant, no PII exposed.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(Submission).filter(Submission.created_at >= cutoff)
    
    if ward:
        query = query.filter(Submission.ward == ward)
    if intent:
        query = query.filter(Submission.intent == intent)
    
    submissions = query.limit(1000).all()
    
    # Anonymize and structure data
    data = []
    for sub in submissions:
        data.append({
            "id": sub.id,
            "intent": sub.intent,
            "ward": sub.ward,
            "status": sub.status,
            "priority": sub.priority,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            # Round location to ward-level precision (privacy)
            "latitude_rounded": round(sub.latitude, 2) if sub.latitude else None,
            "longitude_rounded": round(sub.longitude, 2) if sub.longitude else None,
        })
    
    return {
        "data": data,
        "count": len(data),
        "period_days": days,
        "filters": {"ward": ward, "intent": intent},
        "generated_at": datetime.utcnow().isoformat(),
        "notice": "This data is anonymized and provided for public transparency. No PII included.",
    }


@router.get("/export/csv")
async def export_csv(
    ward: Optional[str] = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Export anonymized data as CSV for RTI requests.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(Submission).filter(Submission.created_at >= cutoff)
    if ward:
        query = query.filter(Submission.ward == ward)
    
    submissions = query.limit(1000).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Intent", "Ward", "Status", "Priority", 
        "Created At", "Latitude (approx)", "Longitude (approx)"
    ])
    
    # Data rows
    for sub in submissions:
        writer.writerow([
            sub.id,
            sub.intent,
            sub.ward,
            sub.status,
            sub.priority,
            sub.created_at.strftime("%Y-%m-%d %H:%M") if sub.created_at else "",
            round(sub.latitude, 2) if sub.latitude else "",
            round(sub.longitude, 2) if sub.longitude else "",
        ])
    
    output.seek(0)
    
    filename = f"civicpulse_data_{ward or 'city'}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/metrics/public")
async def get_public_metrics(db: Session = Depends(get_db)):
    """
    Public metrics dashboard data.
    No authentication required.
    """
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Aggregate stats
    total = db.query(Submission).count()
    resolved = db.query(Submission).filter(Submission.status == "resolved").count()
    week_count = db.query(Submission).filter(Submission.created_at >= week_ago).count()
    week_resolved = db.query(Submission).filter(
        Submission.status == "resolved",
        Submission.updated_at >= week_ago
    ).count()
    
    # By ward stats
    ward_stats = db.query(
        Submission.ward,
        func.count(Submission.id).label("total"),
        func.sum(func.cast(Submission.status == "resolved", Integer)).label("resolved")
    ).group_by(Submission.ward).all()
    
    ward_data = []
    for ws in ward_stats:
        if ws.ward:
            ward_data.append({
                "ward": ws.ward,
                "total": ws.total,
                "resolved": ws.resolved or 0,
                "resolution_rate": round((ws.resolved or 0) / max(ws.total, 1) * 100, 1)
            })
    
    # Sort by resolution rate
    ward_data.sort(key=lambda x: -x["resolution_rate"])
    
    # By intent stats
    intent_stats = db.query(
        Submission.intent,
        func.count(Submission.id).label("count")
    ).group_by(Submission.intent).order_by(func.count(Submission.id).desc()).limit(10).all()
    
    return {
        "summary": {
            "total_submissions": total,
            "total_resolved": resolved,
            "resolution_rate": round(resolved / max(total, 1) * 100, 1),
            "week_submissions": week_count,
            "week_resolved": week_resolved,
        },
        "ward_leaderboard": ward_data[:10],
        "top_issues": [{"intent": i.intent, "count": i.count} for i in intent_stats],
        "generated_at": now.isoformat(),
    }


@router.get("/ward/{ward_name}/report")
async def get_ward_report(
    ward_name: str,
    db: Session = Depends(get_db)
):
    """
    Detailed report for a specific ward.
    Suitable for councilor briefings.
    """
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    
    # Get ward submissions
    submissions = db.query(Submission).filter(
        Submission.ward == ward_name,
        Submission.created_at >= month_ago
    ).all()
    
    if not submissions:
        raise HTTPException(status_code=404, detail="Ward not found or no data available")
    
    # Calculate metrics
    total = len(submissions)
    resolved = len([s for s in submissions if s.status == "resolved"])
    pending = len([s for s in submissions if s.status == "pending"])
    assigned = len([s for s in submissions if s.status == "assigned"])
    
    # By intent breakdown
    intent_counts = {}
    for sub in submissions:
        intent = sub.intent or "unknown"
        intent_counts[intent] = intent_counts.get(intent, 0) + 1
    
    # Priority distribution
    priority_counts = {}
    for sub in submissions:
        priority = sub.priority or "normal"
        priority_counts[priority] = priority_counts.get(priority, 0) + 1
    
    # Active clusters in ward
    clusters = db.query(Cluster).filter(
        Cluster.ward == ward_name,
        Cluster.status != "resolved"
    ).all()
    
    return {
        "ward": ward_name,
        "period": "last_30_days",
        "summary": {
            "total_submissions": total,
            "resolved": resolved,
            "pending": pending,
            "assigned": assigned,
            "resolution_rate": round(resolved / max(total, 1) * 100, 1),
        },
        "by_intent": [{"intent": k, "count": v} for k, v in sorted(intent_counts.items(), key=lambda x: -x[1])],
        "by_priority": priority_counts,
        "active_clusters": len(clusters),
        "hot_spots": [
            {"cluster_id": c.cluster_id, "intent": c.intent, "size": c.size, "priority": c.priority}
            for c in clusters[:5]
        ],
        "generated_at": now.isoformat(),
    }
