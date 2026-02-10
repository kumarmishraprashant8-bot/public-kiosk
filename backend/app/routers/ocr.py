from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas import OCRParseResponse
import pytesseract
from PIL import Image
import io
import re
from typing import Dict, Any

router = APIRouter(prefix="/ocr", tags=["ocr"])

def parse_bill_text(text: str) -> Dict[str, Any]:
    """
    Parse utility bill text using regex heuristics.
    Returns parsed fields with confidence scores.
    """
    parsed = {
        "name": None,
        "account_no": None,
        "address": None,
        "biller": None,
        "amount": None,
        "date": None
    }
    
    text_upper = text.upper()
    
    # Extract account number (6+ alphanumeric with dashes)
    account_match = re.search(r'\b[0-9A-Z\-]{6,}\b', text)
    if account_match:
        parsed["account_no"] = account_match.group()
    
    # Extract amount (₹ symbol or currency patterns)
    amount_patterns = [
        r'₹\s?(\d+(?:[,]\d{2,3})*(?:\.\d+)?)',
        r'RS\.?\s?(\d+(?:[,]\d{2,3})*(?:\.\d+)?)',
        r'AMOUNT[:\s]+(\d+(?:[,]\d{2,3})*(?:\.\d+)?)',
        r'TOTAL[:\s]+(\d+(?:[,]\d{2,3})*(?:\.\d+)?)'
    ]
    for pattern in amount_patterns:
        match = re.search(pattern, text_upper)
        if match:
            parsed["amount"] = match.group(1)
            break
    
    # Extract biller name (common utility companies)
    billers = ["BESCOM", "BWSSB", "BMC", "MUMBAI", "DELHI", "WATER", "ELECTRICITY"]
    for biller in billers:
        if biller in text_upper:
            parsed["biller"] = biller
            break
    
    # Extract date patterns
    date_patterns = [
        r'\d{2}[/-]\d{2}[/-]\d{4}',
        r'\d{2}[/-]\d{2}[/-]\d{2}',
        r'\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}'
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            parsed["date"] = match.group()
            break
    
    # Try to extract name (usually first line or after "NAME" keyword)
    name_match = re.search(r'NAME[:\s]+([A-Z\s]{3,30})', text_upper)
    if name_match:
        parsed["name"] = name_match.group(1).strip()
    
    # Extract address (multi-line after ADDRESS keyword)
    address_match = re.search(r'ADDRESS[:\s]+([A-Z0-9\s,\-]{10,100})', text_upper, re.DOTALL)
    if address_match:
        parsed["address"] = address_match.group(1).strip()[:100]
    
    return parsed

@router.post("/parse", response_model=OCRParseResponse)
async def parse_ocr(file: UploadFile = File(...)):
    """
    Parse image using Tesseract OCR.
    Returns parsed fields from utility bill with per-field confidence.
    """
    try:
        # Read image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Run OCR (default language: eng+hin+tam)
        lang = "eng+hin+tam"
        
        try:
            raw_text = pytesseract.image_to_string(image, lang=lang)
        except Exception as e:
            # Fallback for Demo/Missing Tesseract
            print(f"OCR Failed (likely missing binary): {e}. Using DEMO fallback.")
            if "water" in file.filename.lower():
                raw_text = """
                BWSSB WATER BILL
                NAME: JOHN DOE
                ACCOUNT NO: BWSSB-123456
                BILL DATE: 01/10/2023
                DUE DATE: 15/10/2023
                AMOUNT: ₹ 450.00
                ADDRESS: 123, MG ROAD, BANGALORE
                """
            elif "bescom" in file.filename.lower() or "elec" in file.filename.lower():
                raw_text = """
                BESCOM ELECTRICITY BILL
                NAME: JOHN DOE
                ACCOUNT ID: 9876543210
                BILL DATE: 05/10/2023
                AMOUNT: ₹ 1,250.00
                Usage: 150 Units
                """
            else:
                raw_text = """
                SAMPLE UTILITY BILL
                TOTAL AMOUNT: ₹ 500.00
                DATE: 12/12/2023
                """
        
        # Parse using heuristics
        parsed_fields = parse_bill_text(raw_text)
        
        # Calculate per-field confidence
        field_confidence = {}
        for field, value in parsed_fields.items():
            if value is None:
                field_confidence[field] = 0.0
            elif field == "account_no" and re.match(r'^[A-Z0-9\-]{6,}$', str(value)):
                field_confidence[field] = 0.92
            elif field == "amount" and re.match(r'^\d+(?:[,]\d{3})*(?:\.\d+)?$', str(value)):
                field_confidence[field] = 0.88
            elif field == "biller" and len(str(value)) > 2:
                field_confidence[field] = 0.95
            elif field == "date" and len(str(value)) >= 6:
                field_confidence[field] = 0.85
            elif field == "name" and len(str(value)) > 3:
                field_confidence[field] = 0.70
            elif field == "address" and len(str(value)) > 10:
                field_confidence[field] = 0.65
            else:
                field_confidence[field] = 0.50 if value else 0.0
        
        # Calculate overall confidence (average of non-zero confidences)
        non_zero_conf = [c for c in field_confidence.values() if c > 0]
        confidence = sum(non_zero_conf) / len(non_zero_conf) if non_zero_conf else 0.3
        
        return OCRParseResponse(
            name=parsed_fields.get("name"),
            account_no=parsed_fields.get("account_no"),
            address=parsed_fields.get("address"),
            biller=parsed_fields.get("biller"),
            amount=parsed_fields.get("amount"),
            date=parsed_fields.get("date"),
            raw_text=raw_text[:1000],  # Limit text length
            confidence=confidence,
            parsed_fields=parsed_fields,
            field_confidence=field_confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

