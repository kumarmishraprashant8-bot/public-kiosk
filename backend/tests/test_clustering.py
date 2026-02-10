import pytest
from app.clustering import ComplaintClustering
from app.database import SessionLocal
from app.models import Submission, User
from datetime import datetime, timedelta

def test_clustering_service():
    """Test clustering service initialization"""
    clustering = ComplaintClustering()
    assert clustering.vectorizer is not None

def test_cluster_submissions_empty():
    """Test clustering with no submissions"""
    clustering = ComplaintClustering()
    db = SessionLocal()
    
    try:
        clusters = clustering.cluster_submissions(db, window_minutes=60)
        # Should return empty list, not crash
        assert isinstance(clusters, list)
    finally:
        db.close()
