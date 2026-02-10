"""
AI-powered endpoints for CivicPulse smart features.
- Duplicate detection
- Priority scoring
- Intent verification
- Smart troubleshooting
- Nearby alerts
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Submission, Cluster
from app.similarity import (
    calculate_text_similarity,
    detect_intent_from_text,
    calculate_priority_score,
    haversine_distance,
    extract_keywords,
    get_troubleshoot_tips
)

router = APIRouter(prefix="/api/ai", tags=["AI"])


# ============ Request/Response Models ============

class DuplicateCheckRequest(BaseModel):
    text: str
    intent: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: float = 200  # Search radius

class DuplicateMatch(BaseModel):
    submission_id: int
    cluster_id: Optional[str] = None
    dist_m: Optional[float] = None
    match_score: float
    similarity_score: float
    distance_meters: Optional[float] = None
    citizen_count: int = 1
    created_at: str

class DuplicateCheckResponse(BaseModel):
    has_duplicates: bool
    duplicate_count: int
    matches: List[DuplicateMatch]
    message: str
    can_join: bool
    suggestion: str = "new"  # "join" | "new"

class IntentCheckRequest(BaseModel):
    text: str
    selected_intent: str

class IntentCheckResponse(BaseModel):
    detected_intent: str
    confidence: float
    matches_selection: bool
    suggested_change: bool
    message: Optional[str]

class PriorityScoreRequest(BaseModel):
    text: str
    intent: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PriorityScoreResponse(BaseModel):
    score: int
    level: str  # LOW, MEDIUM, HIGH, CRITICAL
    estimated_response: str
    confidence: Optional[float] = None
    eta_seconds: Optional[int] = None
    breakdown: dict

class TroubleshootTip(BaseModel):
    tip: str
    icon: str

class TroubleshootResponse(BaseModel):
    intent: str
    tips: List[TroubleshootTip]
    message: str

class AlertResponse(BaseModel):
    has_alerts: bool
    alerts: List[dict]


# ============ Endpoints ============

@router.post("/duplicate-check", response_model=DuplicateCheckResponse)
async def check_duplicates(
    request: DuplicateCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Check for similar complaints nearby.
    Uses text similarity (cosine) + geo proximity. Threshold 0.65.
    """
    from app.models import Cluster

    # Recent window (24h for demo)
    cutoff = datetime.utcnow() - timedelta(hours=24)
    query = db.query(Submission).filter(
        and_(
            Submission.created_at >= cutoff,
            Submission.intent == request.intent
        )
    )
    recent = query.all()

    # Build submission_id -> cluster map
    clusters = db.query(Cluster).filter(Cluster.submission_ids.isnot(None)).all()
    sub_to_cluster = {}
    for c in clusters:
        for sid in (c.submission_ids or []):
            sub_to_cluster[sid] = c.cluster_id

    if not recent:
        return DuplicateCheckResponse(
            has_duplicates=False,
            duplicate_count=0,
            matches=[],
            message="No similar complaints found. Yours will be the first!",
            can_join=False,
            suggestion="new"
        )

    matches = []
    for sub in recent:
        sim_score = calculate_text_similarity(request.text, sub.text)
        if sim_score < 0.65:
            continue
        distance = None
        if request.latitude and request.longitude and sub.latitude and sub.longitude:
            distance = haversine_distance(
                request.latitude, request.longitude,
                sub.latitude, sub.longitude
            )
            if distance > request.radius_meters:
                continue
        # Combined geo+text score
        geo_factor = 1.0 - (distance / request.radius_meters) if distance else 1.0
        match_score = round(sim_score * 0.7 + geo_factor * 0.3, 2)
        citizen_count = getattr(sub, "citizen_count", 1) or 1
        matches.append(DuplicateMatch(
            submission_id=sub.id,
            cluster_id=sub_to_cluster.get(sub.id),
            dist_m=round(distance) if distance else None,
            match_score=match_score,
            similarity_score=round(sim_score, 2),
            distance_meters=round(distance) if distance else None,
            citizen_count=citizen_count,
            created_at=sub.created_at.isoformat() if sub.created_at else ""
        ))

    matches.sort(key=lambda m: m.match_score, reverse=True)
    matches = matches[:5]
    has_duplicates = len(matches) > 0
    total_citizens = sum(m.citizen_count for m in matches) + 1 if has_duplicates else 0

    return DuplicateCheckResponse(
        has_duplicates=has_duplicates,
        duplicate_count=len(matches),
        matches=matches,
        message=f"Found {len(matches)} similar complaint(s) nearby! {total_citizens} citizens have reported this." if has_duplicates else "No similar complaints found nearby.",
        can_join=has_duplicates,
        suggestion="join" if has_duplicates else "new"
    )


@router.post("/intent-check", response_model=IntentCheckResponse)
async def check_intent(request: IntentCheckRequest):
    """
    Verify if selected intent matches the description text.
    Uses NLP keyword matching.
    """
    detected, confidence = detect_intent_from_text(request.text)
    
    matches = detected == request.selected_intent
    
    if matches or confidence < 0.4:
        return IntentCheckResponse(
            detected_intent=detected,
            confidence=round(confidence, 2),
            matches_selection=True,
            suggested_change=False,
            message=None
        )
    
    # Mismatch detected
    intent_labels = {
        "water_outage": "Water Issue",
        "electricity_outage": "Electricity Issue",
        "garbage": "Garbage/Waste",
        "road": "Road/Pothole",
        "sewage": "Sewage/Drainage",
        "streetlight": "Streetlight"
    }
    
    detected_label = intent_labels.get(detected, detected)
    
    return IntentCheckResponse(
        detected_intent=detected,
        confidence=round(confidence, 2),
        matches_selection=False,
        suggested_change=True,
        message=f"This looks like a {detected_label}. Would you like to switch category?"
    )


@router.post("/priority-score", response_model=PriorityScoreResponse)
async def get_priority_score(
    request: PriorityScoreRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate priority score for a submission.
    Higher score = more urgent.
    """
    # Count similar complaints nearby
    similar_count = 0
    hours_since_first = 0
    
    if request.latitude and request.longitude:
        cutoff = datetime.utcnow() - timedelta(days=7)
        nearby = db.query(Submission).filter(
            and_(
                Submission.created_at >= cutoff,
                Submission.intent == request.intent
            )
        ).all()
        
        for sub in nearby:
            if sub.latitude and sub.longitude:
                distance = haversine_distance(
                    request.latitude, request.longitude,
                    sub.latitude, sub.longitude
                )
                if distance <= 500:  # 500m radius
                    similar_count += 1
                    # Track oldest
                    hours = (datetime.utcnow() - sub.created_at).total_seconds() / 3600
                    hours_since_first = max(hours_since_first, hours)
    
    # Check peak hours (8-10 AM, 6-9 PM)
    current_hour = datetime.now().hour
    is_peak = current_hour in [8, 9, 10, 18, 19, 20, 21]
    
    result = calculate_priority_score(
        text=request.text,
        intent=request.intent,
        similar_count=similar_count,
        hours_since_first=hours_since_first,
        is_peak_hours=is_peak
    )
    
    return PriorityScoreResponse(
        score=result["score"],
        level=result["level"],
        estimated_response=result["estimated_response"],
        confidence=result.get("confidence"),
        eta_seconds=result.get("eta_seconds"),
        breakdown=result["breakdown"]
    )


@router.get("/troubleshoot", response_model=TroubleshootResponse)
async def get_troubleshoot(
    intent: str = Query(..., description="Issue type")
):
    """
    Get smart troubleshooting tips before submission.
    Helps reduce unnecessary complaints.
    """
    tips = get_troubleshoot_tips(intent)
    
    if tips:
        return TroubleshootResponse(
            intent=intent,
            tips=[TroubleshootTip(**t) for t in tips],
            message="Before submitting, please check these:"
        )
    
    return TroubleshootResponse(
        intent=intent,
        tips=[],
        message="No troubleshooting tips available for this category."
    )


@router.get("/alerts/nearby", response_model=AlertResponse)
async def get_nearby_alerts(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    intent: Optional[str] = Query(None)
):
    """
    Get active maintenance/outage alerts for the area.
    In demo mode, returns simulated alerts.
    """
    from app.config import settings
    
    # Demo alerts (simulated)
    demo_alerts = []
    
    if settings.DEMO_MODE:
        current_hour = datetime.now().hour
        
        if intent == "water_outage":
            demo_alerts.append({
                "type": "maintenance",
                "title": "Scheduled Water Maintenance",
                "message": f"Water supply maintenance in your area until {(current_hour + 3) % 24}:00. You may not need to file a complaint.",
                "severity": "info",
                "active": True
            })
        elif intent == "electricity_outage":
            demo_alerts.append({
                "type": "outage",
                "title": "Known Power Outage",
                "message": "BESCOM is aware of power issues in this area. Restoration expected within 2 hours.",
                "severity": "warning",
                "active": True
            })
    
    return AlertResponse(
        has_alerts=len(demo_alerts) > 0,
        alerts=demo_alerts
    )


@router.get("/cluster/{cluster_id}/explanation")
async def get_cluster_explanation(
    cluster_id: str,
    db: Session = Depends(get_db)
):
    """
    Get AI-generated explanation for why a cluster exists.
    """
    cluster = db.query(Cluster).filter(Cluster.cluster_id == cluster_id).first()
    
    if not cluster:
        return {"error": "Cluster not found"}
    
    # Get submissions in cluster
    submissions = db.query(Submission).filter(
        Submission.id.in_(cluster.submission_ids)
    ).all()
    
    if not submissions:
        return {"explanation": "No submissions found in cluster"}
    
    # Analyze
    all_text = " ".join(s.text for s in submissions)
    keywords = extract_keywords(all_text, top_n=5)
    
    # Time analysis
    times = [s.created_at for s in submissions]
    time_span_minutes = (max(times) - min(times)).total_seconds() / 60
    
    # Build explanation
    explanation_parts = []
    
    explanation_parts.append(f"📊 {len(submissions)} complaints in {int(time_span_minutes)} minutes")
    
    if cluster.center_latitude and cluster.center_longitude:
        explanation_parts.append(f"📍 Clustered around location ({cluster.center_latitude:.4f}, {cluster.center_longitude:.4f})")
    
    if keywords:
        explanation_parts.append(f"🔑 Common keywords: {', '.join(keywords)}")
    
    if cluster.escalated:
        explanation_parts.append("⚠️ Auto-escalated due to high volume")
    
    intent_labels = {
        "water_outage": "Water Supply",
        "electricity_outage": "Electricity",
        "garbage": "Garbage Collection",
        "road": "Road Issues",
        "sewage": "Sewage/Drainage",
        "streetlight": "Street Lighting"
    }
    
    return {
        "cluster_id": cluster_id,
        "size": cluster.size,
        "intent": cluster.intent,
        "intent_label": intent_labels.get(cluster.intent, cluster.intent),
        "priority": cluster.priority,
        "escalated": cluster.escalated,
        "explanation": "\n".join(explanation_parts),
        "keywords": keywords,
        "time_span_minutes": int(time_span_minutes),
        "submissions": [
            {
                "id": s.id,
                "text": s.text[:100] + "..." if len(s.text) > 100 else s.text,
                "created_at": s.created_at.isoformat()
            }
            for s in submissions[:5]
        ]
    }
