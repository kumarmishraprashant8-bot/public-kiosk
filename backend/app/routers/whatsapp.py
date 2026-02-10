"""
WhatsApp Business API integration for CivicPulse.
Handles incoming webhooks and sends interactive messages.
Demo mode with simulated responses.
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import json
import hashlib

from app.database import get_db
from app.models import Submission, User

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# Demo mode flag - set to False when real credentials are available
DEMO_MODE = True


def generate_template_message(template_name: str, params: dict) -> dict:
    """Generate WhatsApp template message structure."""
    templates = {
        "complaint_received": {
            "text": f"✅ Complaint Received!\n\nReceipt: {params.get('receipt_code', 'N/A')}\nCategory: {params.get('category', 'N/A')}\nWard: {params.get('ward', 'N/A')}\n\nTrack status: civicpulse.city/track/{params.get('receipt_code', '')}",
            "buttons": [
                {"type": "quick_reply", "text": "Track Status"},
                {"type": "quick_reply", "text": "Add Details"},
            ]
        },
        "status_update": {
            "text": f"📢 Status Update\n\nYour complaint #{params.get('receipt_code', 'N/A')} has been updated.\n\nNew Status: {params.get('status', 'N/A')}\n{params.get('notes', '')}",
            "buttons": [
                {"type": "quick_reply", "text": "View Details"},
                {"type": "quick_reply", "text": "Rate Service"},
            ]
        },
        "resolution_complete": {
            "text": f"🎉 Issue Resolved!\n\nComplaint #{params.get('receipt_code', '')} has been resolved.\n\nResolution: {params.get('resolution', 'Fixed')}\nTime taken: {params.get('time_hours', '4')} hours\n\nThank you for making our city better! 🏙️",
            "buttons": [
                {"type": "quick_reply", "text": "⭐ Rate 5 Stars"},
                {"type": "quick_reply", "text": "⭐⭐ Rate 4 Stars"},
                {"type": "quick_reply", "text": "Report Again"},
            ]
        },
    }
    return templates.get(template_name, {"text": "Unknown template", "buttons": []})


@router.post("/webhook")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    WhatsApp Cloud API webhook handler.
    Processes incoming messages and sends responses.
    """
    try:
        body = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Verify webhook (Meta sends a verification challenge)
    if "hub.verify_token" in str(request.query_params):
        verify_token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")
        if verify_token == "civicpulse_verify_2024":
            return int(challenge)
        raise HTTPException(status_code=403, detail="Invalid verify token")
    
    # Process incoming message
    entry = body.get("entry", [{}])[0]
    changes = entry.get("changes", [{}])[0]
    value = changes.get("value", {})
    messages = value.get("messages", [])
    
    responses = []
    
    for msg in messages:
        sender = msg.get("from", "")
        msg_type = msg.get("type", "")
        
        if msg_type == "text":
            text = msg.get("text", {}).get("body", "").lower()
            response = await process_text_message(text, sender, db)
            responses.append(response)
        
        elif msg_type == "interactive":
            button_id = msg.get("interactive", {}).get("button_reply", {}).get("id", "")
            response = await process_button_click(button_id, sender, db)
            responses.append(response)
        
        elif msg_type == "image":
            # Handle image uploads for complaint evidence
            response = {
                "to": sender,
                "type": "text",
                "text": {"body": "📸 Photo received! To file a complaint with this image, please describe the issue."}
            }
            responses.append(response)
    
    return {"status": "processed", "responses": responses if DEMO_MODE else "sent"}


async def process_text_message(text: str, sender: str, db: Session) -> dict:
    """Process incoming text messages."""
    # Command handling
    if text.startswith("/track"):
        parts = text.split()
        if len(parts) > 1:
            code = parts[1].upper()
            return await track_complaint(code, sender, db)
        return {"text": "Please provide receipt code. Usage: /track ABC123"}
    
    elif text.startswith("/new") or any(kw in text for kw in ["complaint", "report", "problem", "issue"]):
        return {
            "to": sender,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": "What type of issue would you like to report?"},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": "cat_water", "title": "💧 Water Issue"}},
                        {"type": "reply", "reply": {"id": "cat_road", "title": "🛣️ Road/Pothole"}},
                        {"type": "reply", "reply": {"id": "cat_garbage", "title": "🗑️ Garbage"}},
                    ]
                }
            }
        }
    
    elif text == "hi" or text == "hello" or text == "start":
        return {
            "to": sender,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": "🏛️ Welcome to CivicPulse!\n\nI can help you:\n• Report civic issues\n• Track your complaints\n• View city stats\n\nWhat would you like to do?"},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": "action_new", "title": "📝 New Complaint"}},
                        {"type": "reply", "reply": {"id": "action_track", "title": "🔍 Track Complaint"}},
                        {"type": "reply", "reply": {"id": "action_stats", "title": "📊 City Stats"}},
                    ]
                }
            }
        }
    
    # Default: assume it's a complaint description
    return {
        "to": sender,
        "type": "text",
        "text": {"body": f"I received your message: \"{text[:50]}...\"\n\nTo file this as a complaint, please select a category or reply with /new"}
    }


async def process_button_click(button_id: str, sender: str, db: Session) -> dict:
    """Process interactive button clicks."""
    if button_id.startswith("cat_"):
        category = button_id.replace("cat_", "")
        return {
            "to": sender,
            "type": "text",
            "text": {"body": f"Selected: {category.upper()}\n\nPlease describe the issue and share your location or address."}
        }
    
    elif button_id == "action_track":
        return {
            "to": sender,
            "type": "text",
            "text": {"body": "Please enter your receipt code.\nExample: /track ABC123"}
        }
    
    elif button_id == "action_stats":
        count = db.query(Submission).count()
        resolved = db.query(Submission).filter(Submission.status == "resolved").count()
        return {
            "to": sender,
            "type": "text",
            "text": {"body": f"📊 City Stats\n\nTotal Reports: {count}\nResolved: {resolved}\nResolution Rate: {round(resolved/max(count,1)*100)}%\n\nKeep reporting to make our city better! 🏙️"}
        }
    
    return {"to": sender, "type": "text", "text": {"body": "Unknown action. Reply 'hi' to start."}}


async def track_complaint(code: str, sender: str, db: Session) -> dict:
    """Track a complaint by receipt code."""
    from app.models import Receipt
    
    receipt = db.query(Receipt).filter(Receipt.short_code == code).first()
    if not receipt:
        return {"text": f"❌ No complaint found with code {code}. Please check and try again."}
    
    submission = db.query(Submission).filter(Submission.id == receipt.submission_id).first()
    if not submission:
        return {"text": "Complaint data not found."}
    
    status_emoji = {"pending": "⏳", "assigned": "👷", "in_progress": "🔧", "resolved": "✅"}.get(submission.status, "❓")
    
    return {
        "to": sender,
        "type": "text",
        "text": {"body": f"📋 Complaint Status\n\nCode: {code}\n{status_emoji} Status: {submission.status.upper()}\nCategory: {submission.intent or 'General'}\nWard: {submission.ward or 'Unknown'}\nFiled: {receipt.created_at.strftime('%d %b %Y') if receipt.created_at else 'N/A'}"}
    }


@router.post("/send")
async def send_whatsapp_message(
    phone: str,
    template: str,
    params: dict = {},
    db: Session = Depends(get_db)
):
    """
    Send a WhatsApp message (for internal use).
    In demo mode, returns the message that would be sent.
    """
    message = generate_template_message(template, params)
    
    if DEMO_MODE:
        return {
            "status": "demo",
            "would_send_to": phone,
            "message": message,
            "note": "Enable production mode to send real messages"
        }
    
    # In production, would call Meta's Graph API here
    # response = requests.post(
    #     f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages",
    #     headers={"Authorization": f"Bearer {ACCESS_TOKEN}"},
    #     json={"messaging_product": "whatsapp", "to": phone, **message}
    # )
    
    return {"status": "sent", "to": phone}


@router.get("/demo/simulate")
async def simulate_conversation(scenario: str = "complaint"):
    """
    Simulate a WhatsApp conversation for demo purposes.
    """
    scenarios = {
        "complaint": [
            {"from": "citizen", "text": "Hi"},
            {"from": "bot", "text": "🏛️ Welcome to CivicPulse! I can help you report issues..."},
            {"from": "citizen", "text": "There's a huge pothole near my house"},
            {"from": "bot", "text": "📋 Complaint Registered!\n\nReceipt: POT2024A\nCategory: Road/Pothole\n\nA crew has been dispatched."},
            {"from": "citizen", "text": "/track POT2024A"},
            {"from": "bot", "text": "🔧 Status: IN_PROGRESS\n\nCrew is on site."},
        ],
        "resolution": [
            {"from": "bot", "text": "🎉 Issue Resolved!\n\nYour pothole complaint has been fixed.\n\nPlease rate our service: ⭐⭐⭐⭐⭐"},
            {"from": "citizen", "button": "⭐ Rate 5 Stars"},
            {"from": "bot", "text": "Thank you for your feedback! You earned +50 points. 🏆"},
        ]
    }
    
    return {
        "scenario": scenario,
        "conversation": scenarios.get(scenario, scenarios["complaint"]),
        "note": "This is a simulation of the WhatsApp integration"
    }
