import io
import uuid
from pathlib import Path
from typing import Tuple

import httpx
from fastapi import HTTPException, UploadFile, status
from PIL import Image

from ..config import UPLOADS_DIR, settings


def validate_and_read_image(file: UploadFile) -> Tuple[bytes, str]:
    filename = file.filename or "upload.jpg"
    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: jpg, jpeg, png, webp.",
        )

    raw = file.file.read(settings.MAX_UPLOAD_BYTES + 1)
    if len(raw) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image file is empty.")
    if len(raw) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds maximum allowed size of 5 MB.",
        )

    # Verify image integrity via Pillow
    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a valid image.",
        )

    return raw, ext


def store_image_bytes(raw: bytes, ext: str, prefix: str = "complaint") -> str:
    unique_name = f"{prefix}_{uuid.uuid4().hex}{ext}"

    # Optional Supabase Storage upload when credentials are configured
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{unique_name}"
            headers = {
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "apikey": settings.SUPABASE_SERVICE_KEY,
                "Content-Type": f"image/{ext.lstrip('.') if ext != '.jpg' else 'jpeg'}",
            }
            resp = httpx.post(url, headers=headers, content=raw, timeout=15.0)
            if resp.status_code in (200, 201):
                return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{settings.SUPABASE_STORAGE_BUCKET}/{unique_name}"
        except Exception:
            # Fall back to local storage cleanly if remote upload fails
            pass

    target_path = UPLOADS_DIR / unique_name
    target_path.write_bytes(raw)
    return f"/api/uploads/{unique_name}"
