import requests
import sys
from app.database import SessionLocal
from app.models import Receipt

# script to verify receipt
db = SessionLocal()
receipt = db.query(Receipt).first()
if not receipt:
    print("No receipts found. Database might be empty.")
else:
    print(f"Testing Receipt: {receipt.receipt_id}")
    try:
        r = requests.get(f"http://localhost:8000/api/receipt/{receipt.receipt_id}/verify")
        print(f"Status: {r.status_code}")
        print(r.json())
    except Exception as e:
        print(f"Request failed: {e}")
db.close()
