from fastapi import APIRouter, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Submission
from app.config import settings
import logging

router = APIRouter(
    prefix="/channels",
    tags=["channels"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

@router.post("/whatsapp/webhook")
async def whatsapp_webhook(
    From: str = Form(...),
    Body: str = Form(...),
    MediaUrl0: str = Form(None),
    Latitude: str = Form(None),
    Longitude: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Handle incoming WhatsApp messages via Twilio.
    Creates a dedicated ticket for the message.
    """
    try:
        # Simplify phone number (remove whatsapp: prefix)
        citizen_phone = From.replace("whatsapp:", "")
        
        # Determine intent/category (Mock logic for now, will replace with NLU later)
        category = "General"
        if "water" in Body.lower():
            category = "Water Supply"
        elif "road" in Body.lower() or "pothole" in Body.lower():
            category = "Roads"
        elif "garbage" in Body.lower():
            category = "Sanitation"

        # Create submission
        submission = Submission(
            description=Body,
            source="whatsapp",
            citizen_mobile=citizen_phone,
            status="pending",
            category=category,
            # Store media if present
            image_url=MediaUrl0,
            # Store geo if present
            latitude=float(Latitude) if Latitude else None,
            longitude=float(Longitude) if Longitude else None,
            
            # Default values
            kiosk_id="whatsapp-bot",
            language="en" # TODO: Auto-detect
        )
        
        db.add(submission)
        db.commit()
        db.refresh(submission)
        
        logger.info(f"Created WhatsApp ticket #{submission.id} from {citizen_phone}")
        
        # Twilio XML Response
        # We return pure XML as expected by Twilio
        from fastapi.responses import Response
        response_text = f"✅ Ticket #{submission.id} created for '{category}'. We will notify you of updates."
        xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{response_text}</Message>
</Response>"""
        return Response(content=xml_content, media_type="application/xml")

    except Exception as e:
        logger.error(f"Error processing WhatsApp message: {e}")
        return Response(content='<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing request.</Message></Response>', media_type="application/xml")
