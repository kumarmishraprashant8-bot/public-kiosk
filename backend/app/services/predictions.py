"""
Predictive analytics service for outbreak detection and forecasting.
Uses cluster growth patterns to predict emerging issues.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

from app.models import Submission, Cluster


class PredictionService:
    """AI-powered prediction engine for civic issues."""
    
    # Seasonal patterns (mock - would be ML-trained in production)
    SEASONAL_PATTERNS = {
        "monsoon": {
            "months": [6, 7, 8, 9],
            "boost": {
                "water_outage": 1.5,
                "sewage": 2.0,
                "road": 1.8,
                "drainage": 2.5,
            }
        },
        "summer": {
            "months": [3, 4, 5],
            "boost": {
                "water_outage": 2.0,
                "electricity_outage": 1.7,
            }
        },
        "winter": {
            "months": [11, 12, 1, 2],
            "boost": {
                "streetlight": 1.3,
            }
        }
    }
    
    def detect_outbreak(self, db: Session, cluster: Cluster, window_hours: int = 6) -> Dict[str, Any]:
        """
        Detect if a cluster is experiencing an outbreak.
        Returns outbreak score and risk assessment.
        """
        now = datetime.utcnow()
        window_start = now - timedelta(hours=window_hours)
        
        # Get recent submissions in this cluster's area
        recent = db.query(Submission).filter(
            Submission.ward == cluster.ward,
            Submission.intent == cluster.intent,
            Submission.created_at >= window_start
        ).all()
        
        # Calculate growth rate
        older = db.query(Submission).filter(
            Submission.ward == cluster.ward,
            Submission.intent == cluster.intent,
            Submission.created_at >= window_start - timedelta(hours=window_hours),
            Submission.created_at < window_start
        ).count()
        
        current_count = len(recent)
        growth_rate = (current_count - older) / max(older, 1)
        
        # Outbreak thresholds
        is_outbreak = growth_rate > 0.5 or current_count > 10
        severity = "critical" if growth_rate > 1.0 else "warning" if growth_rate > 0.5 else "normal"
        
        # Time to critical estimate
        if growth_rate > 0:
            hours_to_critical = max(1, int(10 / growth_rate))
        else:
            hours_to_critical = 999
        
        return {
            "cluster_id": cluster.cluster_id,
            "is_outbreak": is_outbreak,
            "severity": severity,
            "growth_rate": round(growth_rate * 100, 1),
            "current_count": current_count,
            "previous_count": older,
            "hours_to_critical": hours_to_critical,
            "recommendation": self._get_outbreak_recommendation(severity, cluster.intent),
        }
    
    def _get_outbreak_recommendation(self, severity: str, intent: str) -> str:
        """Get actionable recommendation based on outbreak severity."""
        if severity == "critical":
            return f"URGENT: Deploy additional {intent} crews immediately. Consider issuing public advisory."
        elif severity == "warning":
            return f"Alert: Monitor {intent} cluster closely. Consider pre-positioning backup crews."
        else:
            return "Situation normal. Continue standard operations."
    
    def predict_7day_demand(self, db: Session, ward: Optional[str] = None) -> Dict[str, Any]:
        """
        Predict crew demand for the next 7 days.
        Uses historical patterns and seasonal adjustments.
        """
        now = datetime.utcnow()
        current_month = now.month
        
        # Get historical averages (last 30 days by intent)
        month_ago = now - timedelta(days=30)
        query = db.query(
            Submission.intent,
            func.count(Submission.id).label("count")
        ).filter(
            Submission.created_at >= month_ago
        )
        
        if ward:
            query = query.filter(Submission.ward == ward)
        
        historical = {r.intent: r.count for r in query.group_by(Submission.intent).all()}
        daily_avg = {k: v / 30 for k, v in historical.items()}
        
        # Apply seasonal boost
        season, boosts = self._get_current_season(current_month)
        
        predictions = []
        for day_offset in range(7):
            day_date = now + timedelta(days=day_offset)
            day_name = day_date.strftime("%A")
            
            day_prediction = {}
            total_expected = 0
            
            for intent, avg in daily_avg.items():
                boost = boosts.get(intent, 1.0)
                # Weekend reduction
                if day_date.weekday() >= 5:
                    boost *= 0.7
                expected = int(avg * boost)
                day_prediction[intent] = expected
                total_expected += expected
            
            predictions.append({
                "date": day_date.strftime("%Y-%m-%d"),
                "day_name": day_name,
                "by_intent": day_prediction,
                "total_expected": total_expected,
                "crew_needed": max(3, total_expected // 5),  # 5 issues per crew
            })
        
        return {
            "ward": ward or "City-wide",
            "season": season,
            "forecast": predictions,
            "total_week": sum(p["total_expected"] for p in predictions),
            "peak_day": max(predictions, key=lambda x: x["total_expected"]),
            "generated_at": now.isoformat(),
        }
    
    def _get_current_season(self, month: int) -> tuple:
        """Get current season and boost factors."""
        for season, config in self.SEASONAL_PATTERNS.items():
            if month in config["months"]:
                return season, config["boost"]
        return "normal", {}
    
    def detect_sentiment_trends(self, db: Session, ward: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze sentiment trends from complaint text.
        Simplified keyword-based approach (would use NLP in production).
        """
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        
        query = db.query(Submission).filter(Submission.created_at >= week_ago)
        if ward:
            query = query.filter(Submission.ward == ward)
        
        submissions = query.all()
        
        # Keyword sentiment analysis
        frustration_keywords = ["again", "still", "never", "worst", "terrible", "angry", "urgent", "emergency"]
        positive_keywords = ["thanks", "resolved", "quick", "good", "happy", "appreciate"]
        
        frustration_count = 0
        positive_count = 0
        
        for sub in submissions:
            text_lower = (sub.text or "").lower()
            if any(kw in text_lower for kw in frustration_keywords):
                frustration_count += 1
            if any(kw in text_lower for kw in positive_keywords):
                positive_count += 1
        
        total = len(submissions)
        frustration_rate = frustration_count / max(total, 1)
        satisfaction_rate = positive_count / max(total, 1)
        
        # Sentiment score from 0-100
        sentiment_score = 50 + (satisfaction_rate * 50) - (frustration_rate * 50)
        
        return {
            "ward": ward or "City-wide",
            "period": "last_7_days",
            "total_submissions": total,
            "sentiment_score": round(max(0, min(100, sentiment_score)), 1),
            "frustration_rate": round(frustration_rate * 100, 1),
            "satisfaction_rate": round(satisfaction_rate * 100, 1),
            "trend": "improving" if sentiment_score > 60 else "concerning" if sentiment_score < 40 else "stable",
            "top_concerns": self._get_top_concerns(submissions),
        }
    
    def _get_top_concerns(self, submissions: List[Submission]) -> List[Dict]:
        """Extract top concern categories from submissions."""
        intent_counts = {}
        for sub in submissions:
            intent = sub.intent or "unknown"
            intent_counts[intent] = intent_counts.get(intent, 0) + 1
        
        sorted_intents = sorted(intent_counts.items(), key=lambda x: -x[1])[:5]
        return [{"intent": intent, "count": count} for intent, count in sorted_intents]


# Singleton instance
prediction_service = PredictionService()
