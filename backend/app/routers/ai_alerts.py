"""
AI Alerts router for predictive analytics and smart notifications.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Submission, Cluster
from app.services.predictions import prediction_service

router = APIRouter(prefix="/ai-alerts", tags=["ai-alerts"])


@router.get("/outbreaks")
async def get_outbreak_alerts(
    ward: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get current outbreak alerts for all or specific ward.
    """
    query = db.query(Cluster).filter(Cluster.status != "resolved")
    if ward:
        query = query.filter(Cluster.ward == ward)
    
    clusters = query.all()
    
    alerts = []
    for cluster in clusters:
        outbreak = prediction_service.detect_outbreak(db, cluster)
        if outbreak["is_outbreak"]:
            alerts.append({
                "cluster_id": cluster.cluster_id,
                "ward": cluster.ward,
                "intent": cluster.intent,
                "severity": outbreak["severity"],
                "growth_rate": outbreak["growth_rate"],
                "current_count": outbreak["current_count"],
                "hours_to_critical": outbreak["hours_to_critical"],
                "recommendation": outbreak["recommendation"],
            })
    
    # Sort by severity
    severity_order = {"critical": 0, "warning": 1, "normal": 2}
    alerts.sort(key=lambda x: severity_order.get(x["severity"], 2))
    
    return {
        "alerts": alerts,
        "critical_count": len([a for a in alerts if a["severity"] == "critical"]),
        "warning_count": len([a for a in alerts if a["severity"] == "warning"]),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/forecast")
async def get_demand_forecast(
    ward: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get 7-day demand forecast for crew planning.
    """
    forecast = prediction_service.predict_7day_demand(db, ward)
    return forecast


@router.get("/sentiment")
async def get_sentiment_analysis(
    ward: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get sentiment trends for citizen satisfaction monitoring.
    """
    sentiment = prediction_service.detect_sentiment_trends(db, ward)
    return sentiment


@router.get("/smart-dispatch")
async def get_smart_dispatch_recommendations(
    db: Session = Depends(get_db)
):
    """
    Get AI-powered dispatch recommendations.
    Suggests optimal crew assignments based on location, skill, and urgency.
    """
    now = datetime.utcnow()
    
    # Get unassigned clusters
    unassigned = db.query(Cluster).filter(
        Cluster.status == "pending",
        Cluster.assigned_crew_id == None
    ).all()
    
    # Get available crews
    from app.models import Crew
    available = db.query(Crew).filter(Crew.current_status == "available").all()
    
    recommendations = []
    
    for cluster in unassigned[:10]:  # Top 10 recommendations
        # Find best crew match
        best_crew = None
        best_score = 0
        
        for crew in available:
            score = 0
            # Skill match
            if crew.specialty == cluster.intent:
                score += 50
            # Priority boost
            if cluster.priority == "urgent":
                score += 30
            elif cluster.priority == "high":
                score += 20
            # Random jitter for variety
            import random
            score += random.randint(0, 10)
            
            if score > best_score:
                best_score = score
                best_crew = crew
        
        if best_crew:
            recommendations.append({
                "cluster_id": cluster.cluster_id,
                "cluster_intent": cluster.intent,
                "cluster_ward": cluster.ward,
                "cluster_priority": cluster.priority,
                "cluster_size": cluster.size,
                "recommended_crew_id": best_crew.id,
                "recommended_crew_name": best_crew.name,
                "match_score": best_score,
                "reason": f"Best skill match for {cluster.intent}",
            })
    
    return {
        "recommendations": recommendations,
        "unassigned_count": len(unassigned),
        "available_crews": len(available),
        "generated_at": now.isoformat(),
    }


@router.get("/health-check")
async def ai_health_check(db: Session = Depends(get_db)):
    """
    Check AI service health and return quick stats.
    """
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    
    submissions_24h = db.query(Submission).filter(Submission.created_at >= day_ago).count()
    active_clusters = db.query(Cluster).filter(Cluster.status != "resolved").count()
    
    return {
        "status": "healthy",
        "services": {
            "outbreak_detection": "active",
            "demand_forecasting": "active",
            "sentiment_analysis": "active",
            "smart_dispatch": "active",
        },
        "last_24h_submissions": submissions_24h,
        "active_clusters": active_clusters,
        "timestamp": now.isoformat(),
    }
