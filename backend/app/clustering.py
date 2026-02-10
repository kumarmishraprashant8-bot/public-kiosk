"""
Clustering logic for complaint submissions using TF-IDF and DBSCAN/KMeans.
"""
from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import DBSCAN
from collections import Counter
import re
from app.models import Submission, Cluster

ESCALATION_THRESHOLD = 5  # Minimum cluster size for escalation
ESCALATION_WINDOW_MINUTES = 20  # Time window for escalation

class ComplaintClustering:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=200, stop_words="english")
    
    def cluster_submissions(self, db: Session, window_minutes: int = 60) -> List[Dict[str, Any]]:
        """
        Cluster recent submissions and detect escalation patterns.
        Returns list of cluster dictionaries.
        """
        # Get recent submissions
        cutoff_time = datetime.utcnow() - timedelta(minutes=window_minutes)
        recent_submissions = db.query(Submission).filter(
            Submission.created_at >= cutoff_time
        ).all()
        
        if len(recent_submissions) < 2:
            return []
        
        # Prepare data
        texts = [s.text for s in recent_submissions]
        submission_ids = [s.id for s in recent_submissions]
        
        # TF-IDF vectorization
        try:
            vectors = self.vectorizer.fit_transform(texts)
        except:
            return []
        
        # Use DBSCAN for clustering
        # eps=0.3, min_samples=2 for demo (lower threshold)
        clustering = DBSCAN(eps=0.3, min_samples=2, metric="cosine")
        labels = clustering.fit_predict(vectors.toarray())
        
        # Group submissions by cluster
        clusters = {}
        for idx, label in enumerate(labels):
            if label == -1:  # Noise point, skip
                continue
            
            if label not in clusters:
                clusters[label] = {
                    "submission_ids": [],
                    "intents": set(),
                    "locations": []
                }
            
            clusters[label]["submission_ids"].append(submission_ids[idx])
            clusters[label]["intents"].add(recent_submissions[idx].intent)
            
            if recent_submissions[idx].latitude and recent_submissions[idx].longitude:
                clusters[label]["locations"].append({
                    "lat": recent_submissions[idx].latitude,
                    "lng": recent_submissions[idx].longitude
                })
        
        # Process clusters
        result = []
        for cluster_id, data in clusters.items():
            if len(data["submission_ids"]) < 2:
                continue
            
            # Calculate center if locations available
            center_lat = None
            center_lng = None
            if data["locations"]:
                center_lat = sum(loc["lat"] for loc in data["locations"]) / len(data["locations"])
                center_lng = sum(loc["lng"] for loc in data["locations"]) / len(data["locations"])
            
            # Determine intent (most common)
            intent = max(data["intents"], key=list(data["intents"]).count) if data["intents"] else "other"
            
            # Check escalation
            cluster_size = len(data["submission_ids"])
            priority = "high" if cluster_size >= ESCALATION_THRESHOLD else "normal"
            
            result.append({
                "cluster_id": f"cluster_{cluster_id}_{int(datetime.utcnow().timestamp())}",
                "intent": intent,
                "submission_ids": data["submission_ids"],
                "center_latitude": center_lat,
                "center_longitude": center_lng,
                "size": cluster_size,
                "priority": priority,
                "escalated": cluster_size >= ESCALATION_THRESHOLD
            })
        
        return result
    
    def _compute_explanation(self, db: Session, cluster_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compute explanation_json: top TF-IDF terms, sample excerpts, time span."""
        submission_ids = cluster_data.get("submission_ids", [])
        subs = db.query(Submission).filter(Submission.id.in_(submission_ids)).all()
        if not subs:
            return {}
        texts = [s.text for s in subs]
        all_text = " ".join(texts).lower()
        tokens = re.findall(r'\b\w{4,}\b', all_text)
        stop = {"water", "supply", "issue", "problem", "area", "since", "electricity", "power"}
        counts = Counter(t for t in tokens if t not in stop)
        top_terms = [w for w, _ in counts.most_common(8)]
        sample_excerpts = [t[:120] + "..." if len(t) > 120 else t for t in texts[:3]]
        times = [s.created_at for s in subs if s.created_at]
        time_span_min = (max(times) - min(times)).total_seconds() / 60 if len(times) >= 2 else 0
        severity_reason = f"{cluster_data['size']} reports in {int(time_span_min)} min"
        return {
            "top_terms": top_terms,
            "sample_excerpts": sample_excerpts,
            "time_span_minutes": round(time_span_min, 1),
            "severity_reason": severity_reason,
        }

    def save_clusters(self, db: Session, clusters: List[Dict[str, Any]]):
        """Save clusters to database with explanation_json"""
        for cluster_data in clusters:
            explanation = self._compute_explanation(db, cluster_data)
            cluster = Cluster(
                cluster_id=cluster_data["cluster_id"],
                intent=cluster_data["intent"],
                submission_ids=cluster_data["submission_ids"],
                center_latitude=cluster_data.get("center_latitude"),
                center_longitude=cluster_data.get("center_longitude"),
                size=cluster_data["size"],
                priority=cluster_data["priority"],
                escalated=cluster_data.get("escalated", False),
                explanation_json=explanation,
                severity_score=float(cluster_data["size"]) * 10.0,
            )
            db.add(cluster)
        db.commit()


clustering_service = ComplaintClustering()
