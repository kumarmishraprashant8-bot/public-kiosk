from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List
import shutil
import os
import uuid
import logging
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/files", tags=["files"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/upload", response_model=dict)
async def upload_file(
    file: UploadFile = File(...),
    # current_user: User = Depends(get_current_user) # Optional for public kiosk?
):
    """
    Secure file upload with validation and mock scanning.
    """
    # 1. Validate Extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # 2. Validate Size (Mock - usually done via reading chunks or middleware)
    # Here we just read content and check length for simplicity in demo
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (Max 5MB)")
    
    # 3. Mock Virus Scan (ClamAV)
    if b"EICAR" in content:  # Standard anti-virus test string
        logger.warning(f"Malware detected in file {file.filename}")
        raise HTTPException(status_code=400, detail="Security threat detected in file")
    
    # 4. Save Securely (Rename)
    file_id = str(uuid.uuid4())
    secure_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, secure_filename)
    
    with open(file_path, "wb") as f:
        f.write(content)
        
    # Return URL (Relative or absolute based on config)
    # In production, this would be an S3 Pre-signed URL
    file_url = f"/static/{secure_filename}" 
    
    return {
        "filename": secure_filename,
        "url": file_url,
        "size": len(content),
        "content_type": file.content_type
    }
