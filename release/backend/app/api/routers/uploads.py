"""Generic upload and media serving endpoints."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from backend.app.core.security import get_current_user
from backend.app.models import User
from backend.app.services.storage import storage


router = APIRouter(prefix="/api/uploads", tags=["Uploads"])


def _validate_object_path(object_path: str) -> str:
    cleaned = object_path.strip().lstrip("/\\")
    if not cleaned or ".." in cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path")
    return cleaned


@router.post("/images")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Upload an image to MinIO and return the stored object location."""

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are allowed")

    file_obj = file.file
    file_obj.seek(0, 2)
    size = file_obj.tell()
    file_obj.seek(0)

    if size <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty upload is not allowed")

    try:
        object_name = storage.upload_file(
            file=file_obj,
            filename=file.filename or "image-upload",
            content_type=file.content_type,
            length=size,
            prefix=f"images/{current_user.id}"
        )
    except Exception as exc:  # pragma: no cover - bubble up as HTTP error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return {
        "object_name": object_name,
        "size": size,
        "content_type": file.content_type,
        "url": f"/api/uploads/{object_name}",
    }


@router.get("/{object_path:path}")
async def get_uploaded_file(object_path: str):
    """Proxy stored files so they can be accessed via the API domain."""

    safe_path = _validate_object_path(object_path)

    try:
        content_type, stream = storage.stream_file(safe_path)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return StreamingResponse(stream, media_type=content_type or "application/octet-stream")
