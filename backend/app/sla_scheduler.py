import asyncio
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Submission, Cluster

async def check_sla_escalations():
    """
    Background task to check for stalled high-priority issues.
    If a HIGH priority issue is pending for > 2 hours, escalate it.
    """
    print("⏰ Running SLA Auto-Escalation Check...")
    db = SessionLocal()
    try:
        # Time threshold (e.g., 2 hours ago)
        threshold = datetime.utcnow() - timedelta(hours=2)
        
        # Find stalled high-priority submissions
        stalled = db.query(Submission).filter(
            Submission.status == 'pending',
            Submission.priority.in_(['high', 'urgent']),
            Submission.created_at <= threshold,
            Submission.escalated == False  # New field or reuse logic
        ).all()
        
        for sub in stalled:
            print(f"⚠️ Auto-Escalating Submission #{sub.id}")
            sub.priority = 'urgent'
            sub.escalated = True # If field exists, otherwise just log/notify
            
            # Find related cluster
            cluster = db.query(Cluster).filter(Cluster.submission_ids.contains([sub.id])).first()
            if cluster:
                cluster.escalated = True
                cluster.priority = 'urgent'
        
        db.commit()
    except Exception as e:
        print(f"❌ SLA Check Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(check_sla_escalations())
