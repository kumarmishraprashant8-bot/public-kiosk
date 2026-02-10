"""
Gamification router for citizen engagement.
Points, badges, leaderboards, and achievement system.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, Submission, Receipt

router = APIRouter(prefix="/gamification", tags=["gamification"])

# Badge definitions
BADGES = {
    "first_report": {
        "id": "first_report",
        "name": "First Voice",
        "description": "Submitted your first complaint",
        "icon": "🎤",
        "points": 50,
        "condition": lambda stats: stats["total_submissions"] >= 1
    },
    "neighborhood_hero": {
        "id": "neighborhood_hero",
        "name": "Neighborhood Hero",
        "description": "5 complaints resolved in your ward",
        "icon": "🦸",
        "points": 200,
        "condition": lambda stats: stats["resolved_count"] >= 5
    },
    "quick_responder": {
        "id": "quick_responder",
        "name": "Quick Responder",
        "description": "Reported 3 issues within 24 hours",
        "icon": "⚡",
        "points": 100,
        "condition": lambda stats: stats["submissions_24h"] >= 3
    },
    "photo_pro": {
        "id": "photo_pro",
        "name": "Photo Pro",
        "description": "Attached photos to 5 complaints",
        "icon": "📸",
        "points": 75,
        "condition": lambda stats: stats["with_photos"] >= 5
    },
    "verified_citizen": {
        "id": "verified_citizen",
        "name": "Verified Citizen",
        "description": "Phone number verified",
        "icon": "✓",
        "points": 25,
        "condition": lambda stats: stats["is_verified"]
    },
    "community_voice": {
        "id": "community_voice",
        "name": "Community Voice",
        "description": "10 total submissions",
        "icon": "📢",
        "points": 150,
        "condition": lambda stats: stats["total_submissions"] >= 10
    },
    "impact_maker": {
        "id": "impact_maker",
        "name": "Impact Maker",
        "description": "Joined 3 existing complaints",
        "icon": "🤝",
        "points": 100,
        "condition": lambda stats: stats["joined_count"] >= 3
    },
    "streak_master": {
        "id": "streak_master",
        "name": "Streak Master",
        "description": "Active for 7 consecutive days",
        "icon": "🔥",
        "points": 300,
        "condition": lambda stats: stats["streak_days"] >= 7
    },
}

def calculate_user_stats(db: Session, user_id: int) -> dict:
    """Calculate gamification stats for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}
    
    submissions = db.query(Submission).filter(Submission.user_id == user_id).all()
    
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    
    resolved = [s for s in submissions if s.status == "resolved"]
    recent_24h = [s for s in submissions if s.created_at and s.created_at > day_ago]
    with_photos = [s for s in submissions if s.uploaded_files]
    
    # Calculate streak (simplified)
    dates_active = set()
    for s in submissions:
        if s.created_at:
            dates_active.add(s.created_at.date())
    
    streak = 0
    check_date = now.date()
    while check_date in dates_active:
        streak += 1
        check_date -= timedelta(days=1)
    
    return {
        "total_submissions": len(submissions),
        "resolved_count": len(resolved),
        "submissions_24h": len(recent_24h),
        "with_photos": len(with_photos),
        "is_verified": user.phone is not None,
        "joined_count": 0,  # Would need separate tracking
        "streak_days": streak,
    }

def calculate_earned_badges(stats: dict) -> List[dict]:
    """Determine which badges a user has earned."""
    earned = []
    for badge_id, badge in BADGES.items():
        if badge["condition"](stats):
            earned.append({
                "id": badge["id"],
                "name": badge["name"],
                "description": badge["description"],
                "icon": badge["icon"],
                "points": badge["points"],
                "earned": True
            })
    return earned

def calculate_total_points(badges: List[dict], stats: dict) -> int:
    """Calculate total points from badges and activities."""
    badge_points = sum(b["points"] for b in badges)
    activity_points = stats.get("total_submissions", 0) * 10  # 10 pts per submission
    activity_points += stats.get("resolved_count", 0) * 25  # 25 pts per resolution
    return badge_points + activity_points


@router.get("/profile/{user_id}")
async def get_citizen_profile(user_id: int, db: Session = Depends(get_db)):
    """Get complete gamification profile for a citizen."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    stats = calculate_user_stats(db, user_id)
    badges = calculate_earned_badges(stats)
    total_points = calculate_total_points(badges, stats)
    
    # Determine level based on points
    level = 1
    level_thresholds = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000]
    for i, threshold in enumerate(level_thresholds):
        if total_points >= threshold:
            level = i + 1
    
    next_level_pts = level_thresholds[min(level, len(level_thresholds)-1)]
    
    return {
        "user_id": user_id,
        "phone_masked": user.citizen_id_masked or f"****{user.phone[-4:] if user.phone else '0000'}",
        "total_points": total_points,
        "level": level,
        "level_name": ["Newcomer", "Reporter", "Active Citizen", "Community Helper", 
                       "Neighborhood Guardian", "Ward Champion", "City Hero", 
                       "Urban Legend", "Civic Master", "Mayor's Friend"][min(level-1, 9)],
        "points_to_next_level": max(0, next_level_pts - total_points),
        "badges": badges,
        "all_badges": [{"id": b["id"], "name": b["name"], "icon": b["icon"], 
                       "description": b["description"], "earned": b["id"] in [x["id"] for x in badges]} 
                      for b in BADGES.values()],
        "stats": stats,
    }


@router.get("/leaderboard")
async def get_leaderboard(
    ward: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get ward or city-wide leaderboard."""
    # Get users with most submissions
    query = db.query(
        Submission.user_id,
        func.count(Submission.id).label("submission_count"),
        func.count(func.nullif(Submission.status != "resolved", True)).label("resolved_count")
    ).group_by(Submission.user_id)
    
    if ward:
        query = query.filter(Submission.ward == ward)
    
    results = query.order_by(func.count(Submission.id).desc()).limit(limit).all()
    
    leaderboard = []
    for rank, (user_id, sub_count, res_count) in enumerate(results, 1):
        user = db.query(User).filter(User.id == user_id).first()
        stats = {"total_submissions": sub_count, "resolved_count": res_count, 
                 "submissions_24h": 0, "with_photos": 0, "is_verified": True, 
                 "joined_count": 0, "streak_days": 0}
        badges = calculate_earned_badges(stats)
        points = calculate_total_points(badges, stats)
        
        leaderboard.append({
            "rank": rank,
            "user_id": user_id,
            "display_name": f"Citizen #{user_id}",
            "phone_masked": user.citizen_id_masked if user else f"****{user_id}",
            "points": points,
            "submissions": sub_count,
            "resolved": res_count,
            "top_badge": badges[0] if badges else None,
        })
    
    return {
        "ward": ward or "City-wide",
        "leaderboard": leaderboard,
        "updated_at": datetime.utcnow().isoformat()
    }


@router.get("/stats/city")
async def get_city_stats(db: Session = Depends(get_db)):
    """Get city-wide gamification stats for public display."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    total_submissions = db.query(Submission).count()
    total_resolved = db.query(Submission).filter(Submission.status == "resolved").count()
    week_resolved = db.query(Submission).filter(
        Submission.status == "resolved",
        Submission.updated_at >= week_ago
    ).count()
    
    total_citizens = db.query(User).count()
    active_citizens = db.query(func.distinct(Submission.user_id)).filter(
        Submission.created_at >= month_ago
    ).count()
    
    # Calculate average resolution time (mock for now)
    avg_resolution_hours = 4.5
    
    return {
        "total_submissions": total_submissions,
        "total_resolved": total_resolved,
        "resolution_rate": round(total_resolved / max(total_submissions, 1) * 100, 1),
        "week_resolved": week_resolved,
        "total_citizens": total_citizens,
        "active_citizens_30d": active_citizens,
        "avg_resolution_hours": avg_resolution_hours,
        "estimated_cost_saved": week_resolved * 500,  # ₹500 per quick resolution
        "updated_at": now.isoformat()
    }
