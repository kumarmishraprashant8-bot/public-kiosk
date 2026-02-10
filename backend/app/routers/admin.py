from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Submission, Cluster, User, Receipt
from app.schemas import ClusterResponse, HeatmapData, AdminSimulateUpdate
from app.clustering import clustering_service
from app.config import settings
from app.receipt import compute_receipt_hash, generate_receipt_id, generate_short_code
from datetime import datetime, timedelta
import random
import uuid

router = APIRouter(prefix="/admin", tags=["admin"])

# Ward centers for Bangalore demo data
WARD_CENTERS = {
    'Koramangala': (12.9352, 77.6245),
    'Indiranagar': (12.9784, 77.6408),
    'Whitefield': (12.9698, 77.7499),
    'Jayanagar': (12.9308, 77.5838),
    'BTM Layout': (12.9166, 77.6101),
    'HSR Layout': (12.9121, 77.6446),
    'Electronic City': (12.8456, 77.6603),
    'Malleshwaram': (13.0035, 77.5645),
}

INTENT_TYPES = ['water_outage', 'electricity_outage', 'garbage', 'road', 'sewage', 'streetlight']
STATUSES = ['pending', 'assigned', 'resolved']
PRIORITIES = ['normal', 'high', 'urgent']

SAMPLE_TEXTS = {
    'water_outage': [
        'No water supply since morning',
        'Water pipeline leakage on main road',
        'Low water pressure in entire area',
        'Contaminated water from taps',
    ],
    'electricity_outage': [
        'Power cut for 4 hours',
        'Frequent voltage fluctuations',
        'Transformer sparking near junction',
        'Street lights not working for 3 days',
    ],
    'garbage': [
        'Garbage not collected for a week',
        'Overflowing dustbin near school',
        'Illegal dumping of construction waste',
        'Foul smell from garbage pile',
    ],
    'road': [
        'Large pothole causing accidents',
        'Road completely damaged after rain',
        'Missing manhole cover dangerously open',
        'Speed breaker too high',
    ],
    'sewage': [
        'Sewage overflowing on main road',
        'Drain blocked causing waterlogging',
        'Foul smell from drainage',
        'Open drain near residential area',
    ],
    'streetlight': [
        'Street light not working',
        'Entire street without lights',
        'Light pole damaged and leaning',
        'Lights flickering all night',
    ],
}


def verify_admin_password(password: str = None):
    """Simple admin password check (demo only)"""
    if not password or password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return True


def generate_masked_phone() -> str:
    """Generate a masked phone number for demo."""
    prefix = random.choice(['74', '98', '91', '88', '77'])
    return f"+91-{prefix}*****{random.randint(100, 999)}"


def generate_random_location(ward_name: str) -> tuple:
    """Generate random location within a ward."""
    center_lat, center_lng = WARD_CENTERS[ward_name]
    lat = center_lat + random.uniform(-0.01, 0.01)
    lng = center_lng + random.uniform(-0.01, 0.01)
    return (lat, lng)


@router.get("/clusters", response_model=HeatmapData)
async def get_clusters(
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Get clusters and heatmap data for admin dashboard.
    Requires admin password (demo: admin123).
    Pass as query parameter: ?password=admin123
    """
    verify_admin_password(password)
    
    # Get recent clusters
    clusters = db.query(Cluster).order_by(Cluster.created_at.desc()).limit(50).all()
    
    # Get recent submissions for heatmap
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    submissions = db.query(Submission).filter(
        Submission.created_at >= cutoff_time,
        Submission.latitude.isnot(None),
        Submission.longitude.isnot(None)
    ).all()
    
    submission_points = [
        {
            "id": s.id,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "intent": s.intent,
            "status": s.status,
            "priority": s.priority,
            "sentiment": random.choice([0.2, 0.4, 0.6, 0.8, 0.9]) if s.priority in ['high', 'urgent'] else random.choice([0.1, 0.3, 0.5]) # Simulated sentiment (0=Good, 1=Angry)
        }
        for s in submissions
    ]
    
    return HeatmapData(
        clusters=[ClusterResponse.from_orm(c) for c in clusters],
        submissions=submission_points
    )


@router.get("/metrics")
async def get_metrics(
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Get KPI metrics for admin dashboard.
    Returns total submissions, active clusters, resolution stats.
    """
    verify_admin_password(password)
    
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_hour = now - timedelta(hours=1)
    
    # Total submissions in last 24h
    total_submissions_24h = db.query(Submission).filter(
        Submission.created_at >= last_24h
    ).count()
    
    # Total submissions all time
    total_submissions = db.query(Submission).count()
    
    # Active clusters (last 24h)
    active_clusters = db.query(Cluster).filter(
        Cluster.created_at >= last_24h
    ).count()
    
    # Escalated clusters
    escalated_clusters = db.query(Cluster).filter(
        Cluster.escalated == True,
        Cluster.created_at >= last_24h
    ).count()
    
    # High priority queue
    high_priority_count = db.query(Submission).filter(
        Submission.priority.in_(['high', 'urgent']),
        Submission.status == 'pending'
    ).count()
    
    # Resolution stats
    resolved_count = db.query(Submission).filter(
        Submission.status == 'resolved',
        Submission.created_at >= last_24h
    ).count()
    
    pending_count = db.query(Submission).filter(
        Submission.status == 'pending'
    ).count()
    
    assigned_count = db.query(Submission).filter(
        Submission.status == 'assigned'
    ).count()
    
    # Submissions in last hour (throughput)
    throughput_hour = db.query(Submission).filter(
        Submission.created_at >= last_hour
    ).count()
    
    # Intent breakdown
    intent_counts = {}
    for intent in INTENT_TYPES:
        intent_counts[intent] = db.query(Submission).filter(
            Submission.intent == intent,
            Submission.created_at >= last_24h
        ).count()
    
    return {
        "total_submissions": total_submissions,
        "submissions_24h": total_submissions_24h,
        "active_clusters": active_clusters,
        "escalated_clusters": escalated_clusters,
        "high_priority_queue": high_priority_count,
        "resolved_24h": resolved_count,
        "pending_count": pending_count,
        "assigned_count": assigned_count,
        "throughput_per_hour": throughput_hour,
        "avg_resolution_time": "45 min",  # Mock for demo
        "intent_breakdown": intent_counts,
        "demo_mode": settings.DEMO_MODE,
        "timestamp": now.isoformat()
    }


@router.post("/seed-demo")
async def seed_demo(
    password: str = None,
    count: int = 200,
    db: Session = Depends(get_db)
):
    """
    Seed database with demo data.
    Generates realistic submissions across Bangalore wards.
    Creates emergent clusters for demo.
    """
    verify_admin_password(password)
    
    print("Seeding demo data...")
    
    now = datetime.utcnow()
    two_hours_ago = now - timedelta(hours=2)
    
    # Get or create demo user
    demo_user = db.query(User).filter(User.phone == "+91-demo-user").first()
    if not demo_user:
        demo_user = User(phone="+91-demo-user", citizen_id_masked="DEMO***USER")
        db.add(demo_user)
        db.flush()
    
    created_submissions = []
    
    # ... code truncated ...
    
    # Run clustering to create clusters
    print("Running clustering on seeded data...")
    clusters = clustering_service.cluster_submissions(db, window_minutes=120)
    clustering_service.save_clusters(db, clusters)

    print(f"Seeded {len(created_submissions)} submissions")
    print(f"Created {len(clusters)} clusters")
    
    # SEED PSYCHIC EVENT (for Milestone 1)
    # Reset existing predicted events first
    from app.models import PredictedEvent
    db.query(PredictedEvent).delete()
    db.commit()
    
    # Create a predicted water outage in Indiranagar
    psychic_event = PredictedEvent(
        center_lat=WARD_CENTERS['Indiranagar'][0],
        center_lng=WARD_CENTERS['Indiranagar'][1],
        predicted_intent="water_outage",
        confidence=0.88,
        status="predicted"
    )
    db.add(psychic_event)
    db.commit()

    return {
        "message": f"Demo data seeded successfully",
        "submissions_created": len(created_submissions),
        "clusters_created": len(clusters),
        "emergent_clusters": ["Koramangala (water)", "Whitefield (electricity)", "BTM Layout (garbage)"],
        "wards_covered": list(set(s.ward for s in created_submissions)),
        "demo_mode": settings.DEMO_MODE,
        "psychic_event_seeded": True
    }


@router.post("/simulate-update")
async def simulate_update(
    update: AdminSimulateUpdate,
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Simulate admin action (assign/dispatch) for demo.
    Updates submission statuses.
    Pass password in request body or query param.
    """
    verify_admin_password(password)
    
    submissions = db.query(Submission).filter(
        Submission.id.in_(update.submission_ids)
    ).all()
    
    if len(submissions) != len(update.submission_ids):
        raise HTTPException(status_code=404, detail="Some submissions not found")
    
    for submission in submissions:
        submission.status = update.status
        if update.priority:
            submission.priority = update.priority
    
    db.commit()
    
    return {
        "message": f"Updated {len(submissions)} submissions",
        "status": update.status,
        "submission_ids": update.submission_ids
    }


async def _run_clustering(db: Session, window_minutes: int = 60):
    """Shared clustering logic."""
    clusters = clustering_service.cluster_submissions(db, window_minutes=window_minutes)
    clustering_service.save_clusters(db, clusters)
    return clusters


@router.post("/run-clustering")
async def run_clustering_api(
    password: str = None,
    db: Session = Depends(get_db)
):
    """POST /admin/run-clustering - spec-compliant trigger."""
    verify_admin_password(password)
    clusters = await _run_clustering(db, window_minutes=120)
    return {"message": f"Clustering completed. Found {len(clusters)} clusters.", "clusters": clusters}


@router.post("/cluster-trigger")
async def trigger_clustering(
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Manually trigger clustering analysis.
    Returns detected clusters.
    Pass password as query parameter: ?password=admin123
    """
    verify_admin_password(password)
    clusters = await _run_clustering(db, window_minutes=60)
    return {"message": f"Clustering completed. Found {len(clusters)} clusters.", "clusters": clusters}


@router.delete("/reset-demo")
async def reset_demo(
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Reset demo data. Clears all submissions and clusters.
    USE WITH CAUTION.
    """
    verify_admin_password(password)
    
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Reset only available in DEMO_MODE")
    
    # Delete in order to respect foreign keys
    db.query(Receipt).delete()
    db.query(Cluster).delete()
    db.query(Submission).delete()
    db.commit()
    
    return {"message": "Demo data reset successfully", "demo_mode": settings.DEMO_MODE}


@router.post("/submission/{submission_id}/join")
async def join_submission(
    submission_id: int,
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Join an existing submission (for duplicate detection flow).
    Increments citizen count on the submission.
    Returns updated submission info.
    """
    # Find the submission
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Increment citizen count (stored in a JSON field or separate counter)
    # For now, we'll track it via cluster or create a simple counter
    current_count = getattr(submission, 'citizen_count', 1) or 1
    submission.citizen_count = current_count + 1
    
    # Boost priority if multiple citizens report
    if submission.citizen_count >= 5 and submission.priority == 'normal':
        submission.priority = 'high'
    elif submission.citizen_count >= 10 and submission.priority == 'high':
        submission.priority = 'urgent'
    
    db.commit()
    db.refresh(submission)
    
    return {
        "message": f"Successfully joined complaint #{submission_id}",
        "submission_id": submission.id,
        "citizen_count": submission.citizen_count,
        "priority": submission.priority,
        "intent": submission.intent,
        "status": submission.status
    }


# ============== SLA & COST ENDPOINTS ==============

@router.get("/sla")
async def get_sla_dashboard(
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Get SLA dashboard with breach alerts and summary statistics.
    Shows all clusters with their SLA status and cost-of-delay.
    """
    verify_admin_password(password)
    
    from app.sla import get_sla_summary, compute_cluster_sla_status, compute_cost_of_delay, get_hours_open
    from app.models import Crew
    
    # Get active clusters (created in last 48h)
    cutoff = datetime.utcnow() - timedelta(hours=48)
    clusters = db.query(Cluster).filter(Cluster.created_at >= cutoff).all()
    
    # Compute summary
    summary = get_sla_summary(clusters)
    
    # Get breached clusters with details
    breached_clusters = []
    at_risk_clusters = []
    
    for cluster in clusters:
        sla_status = compute_cluster_sla_status(cluster)
        is_resolved = cluster.resolved_at is not None
        
        # Get cost info
        citizen_count = cluster.size or 1
        hours_open = get_hours_open(cluster.created_at, cluster.resolved_at)
        cost_info = compute_cost_of_delay(cluster.intent, citizen_count, hours_open, is_resolved)
        
        cluster_info = {
            "cluster_id": cluster.cluster_id,
            "intent": cluster.intent,
            "ward": cluster.ward,
            "size": cluster.size,
            "priority": cluster.priority,
            "sla_status": sla_status,
            "cost": cost_info,
            "assigned_crew_id": cluster.assigned_crew_id,
        }
        
        if sla_status['is_breached'] and not is_resolved:
            breached_clusters.append(cluster_info)
        elif sla_status['time_remaining_hours'] < 1 and not is_resolved:
            at_risk_clusters.append(cluster_info)
    
    return {
        "summary": summary,
        "breached_clusters": breached_clusters,
        "at_risk_clusters": at_risk_clusters,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/cost-analysis")
async def get_cost_analysis(
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive cost-of-delay analysis.
    Shows economic impact of unresolved issues.
    """
    verify_admin_password(password)
    
    from app.sla import compute_cost_of_delay, get_hours_open
    
    # Get all active (unresolved) clusters
    clusters = db.query(Cluster).filter(Cluster.resolved_at.is_(None)).all()
    
    total_cost = 0
    total_hourly_rate = 0
    by_intent = {}
    by_ward = {}
    
    for cluster in clusters:
        hours_open = get_hours_open(cluster.created_at, None)
        cost_info = compute_cost_of_delay(cluster.intent, cluster.size or 1, hours_open, False)
        
        total_cost += cost_info['total_cost']
        total_hourly_rate += cost_info['hourly_rate']
        
        # Aggregate by intent
        intent = cluster.intent
        if intent not in by_intent:
            by_intent[intent] = {"cost": 0, "clusters": 0, "citizens": 0}
        by_intent[intent]["cost"] += cost_info['total_cost']
        by_intent[intent]["clusters"] += 1
        by_intent[intent]["citizens"] += cluster.size or 1
        
        # Aggregate by ward
        ward = cluster.ward or "Unknown"
        if ward not in by_ward:
            by_ward[ward] = {"cost": 0, "clusters": 0}
        by_ward[ward]["cost"] += cost_info['total_cost']
        by_ward[ward]["clusters"] += 1
    
    return {
        "total_cost_incurred": round(total_cost, 2),
        "active_hourly_rate": round(total_hourly_rate, 2),
        "active_clusters": len(clusters),
        "by_intent": by_intent,
        "by_ward": by_ward,
        "currency": "INR",
        "timestamp": datetime.utcnow().isoformat(),
        "message": f"₹{round(total_hourly_rate, 0)}/hour being incurred due to {len(clusters)} unresolved issues",
    }


@router.post("/cluster/{cluster_id}/assign")
async def assign_cluster(
    cluster_id: str,
    crew_id: int,
    notes: str = None,
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Assign a crew to a cluster.
    Updates cluster SLA and creates thread for communication.
    """
    verify_admin_password(password)
    
    from app.models import Crew, Thread, Message, AuditLog
    from app.sla import compute_sla_deadline, get_sla_target_hours
    
    # Find cluster
    cluster = db.query(Cluster).filter(
        (Cluster.cluster_id == cluster_id) | (Cluster.id == int(cluster_id) if cluster_id.isdigit() else False)
    ).first()
    
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Find crew
    crew = db.query(Crew).filter(Crew.id == crew_id).first()
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    # Assign crew
    cluster.assigned_crew_id = crew.id
    cluster.assigned_at = datetime.utcnow()
    
    # Compute SLA
    cluster.sla_target_hours = get_sla_target_hours(cluster.priority)
    cluster.sla_deadline = compute_sla_deadline(cluster.created_at, cluster.priority)
    
    # Update crew status
    crew.current_status = "assigned"
    
    # Create or get thread
    thread = db.query(Thread).filter(Thread.cluster_id == cluster.id).first()
    if not thread:
        thread = Thread(
            thread_id=str(uuid.uuid4()),
            cluster_id=cluster.id,
            status="open",
        )
        db.add(thread)
        db.flush()
    
    # Add assignment message
    assign_msg = Message(
        thread_id=thread.id,
        author_type="system",
        author_name="CivicPulse",
        content=f"Crew '{crew.name}' has been assigned to this issue. They will contact you shortly.",
        message_type="status_update",
        message_metadata={"crew_id": crew.crew_id, "assigned_at": datetime.utcnow().isoformat()},
    )
    db.add(assign_msg)
    
    # Audit log
    audit = AuditLog(
        action="assign_crew",
        actor_type="admin",
        resource_type="cluster",
        resource_id=cluster.cluster_id,
        details={"crew_id": crew.crew_id, "crew_name": crew.name, "notes": notes},
    )
    db.add(audit)
    
    db.commit()
    
    return {
        "message": f"Crew '{crew.name}' assigned to cluster {cluster.cluster_id}",
        "cluster_id": cluster.cluster_id,
        "crew_id": crew.crew_id,
        "crew_name": crew.name,
        "sla_deadline": cluster.sla_deadline.isoformat() if cluster.sla_deadline else None,
        "thread_id": thread.thread_id,
    }


@router.get("/cluster/{cluster_id}/explain")
async def explain_cluster(
    cluster_id: str,
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Get detailed explanation of a cluster.
    Shows why submissions were grouped, severity reasons, and suggested actions.
    """
    verify_admin_password(password)
    
    from app.sla import compute_cluster_sla_status, compute_cost_of_delay, get_hours_open
    from app.models import Crew, Thread
    
    # Find cluster
    cluster = db.query(Cluster).filter(
        (Cluster.cluster_id == cluster_id) | (Cluster.id == int(cluster_id) if cluster_id.isdigit() else False)
    ).first()
    
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Get submissions in cluster
    submission_ids = cluster.submission_ids or []
    submissions = db.query(Submission).filter(Submission.id.in_(submission_ids)).all()
    
    # Analyze texts for common patterns
    texts = [s.text for s in submissions if s.text]
    keywords = []
    keyword_freq = {}
    for text in texts:
        words = text.lower().split()
        for word in words:
            if len(word) > 4:  # Skip short words
                keyword_freq[word] = keyword_freq.get(word, 0) + 1
    
    # Use explanation_json if available, else compute
    explanation = getattr(cluster, "explanation_json", None) or {}
    sk = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)[:5]
    keywords = explanation.get("top_terms") or [k for k, v in sk if v > 1]
    sample_texts = explanation.get("sample_excerpts") or texts[:3]
    
    # Time analysis
    if submissions:
        first_report = min(s.created_at for s in submissions)
        last_report = max(s.created_at for s in submissions)
        time_span_minutes = (last_report - first_report).total_seconds() / 60
    else:
        time_span_minutes = 0
    
    # Severity reasons
    severity_reasons = []
    if cluster.size >= 10:
        severity_reasons.append("Large number of affected citizens (10+)")
    if cluster.priority == "urgent":
        severity_reasons.append("Marked as urgent priority")
    if cluster.escalated:
        severity_reasons.append("Has been escalated")
    if time_span_minutes < 30 and cluster.size >= 5:
        severity_reasons.append("Rapid influx of reports (cluster formed quickly)")
    
    intent_severity_map = {
        'water_outage': "Critical - Affects health and sanitation",
        'electricity_outage': "High - Affects productivity and safety",
        'sewage': "High - Health and sanitation risk",
        'garbage': "Medium - Hygiene concern",
        'road': "Medium-High - Safety hazard",
        'streetlight': "Normal - Night-time safety",
    }
    if cluster.intent in intent_severity_map:
        severity_reasons.append(intent_severity_map[cluster.intent])
    
    # Get SLA and cost
    sla_status = compute_cluster_sla_status(cluster)
    hours_open = get_hours_open(cluster.created_at, cluster.resolved_at)
    cost_info = compute_cost_of_delay(cluster.intent, cluster.size or 1, hours_open, cluster.resolved_at is not None)
    
    # Suggested actions
    suggested_actions = []
    if not cluster.assigned_crew_id:
        # Find suitable crews
        suitable_specialty = cluster.intent.replace('_outage', '').replace('_', ' ')
        available_crews = db.query(Crew).filter(
            Crew.current_status == "available"
        ).limit(3).all()
        
        if available_crews:
            suggested_actions.append({
                "action": "assign_crew",
                "description": f"Assign to available crew",
                "suggested_crews": [{"id": c.id, "name": c.name, "specialty": c.specialty} for c in available_crews],
            })
    
    if sla_status['is_breached']:
        suggested_actions.append({
            "action": "escalate",
            "description": "SLA breached - Consider escalation to supervisor",
        })
    
    # Get thread if exists
    thread = db.query(Thread).filter(Thread.cluster_id == cluster.id).first()
    
    return {
        "cluster_id": cluster.cluster_id,
        "intent": cluster.intent,
        "ward": cluster.ward,
        "size": cluster.size,
        "priority": cluster.priority,
        "clustering_reason": f"{cluster.size} similar reports about '{cluster.intent.replace('_', ' ')}' in {cluster.ward or 'the area'}",
        "keywords": keywords,
        "sample_texts": sample_texts,
        "time_span_minutes": round(time_span_minutes, 1),
        "severity_reasons": severity_reasons,
        "sla_status": sla_status,
        "cost_analysis": cost_info,
        "suggested_actions": suggested_actions,
        "has_thread": thread is not None,
        "thread_id": thread.thread_id if thread else None,
        "assigned_crew_id": cluster.assigned_crew_id,
    }


@router.get("/audit")
async def get_audit_logs(
    limit: int = 100,
    action: str = None,
    resource_type: str = None,
    password: str = None,
    db: Session = Depends(get_db)
):
    """
    Get audit logs for admin actions.
    Provides transparency and accountability trail.
    """
    verify_admin_password(password)
    
    from app.models import AuditLog
    
    query = db.query(AuditLog)
    
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "actor_type": log.actor_type,
                "actor_id": log.actor_id,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "timestamp": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "count": len(logs),
        "timestamp": datetime.utcnow().isoformat(),
    }
