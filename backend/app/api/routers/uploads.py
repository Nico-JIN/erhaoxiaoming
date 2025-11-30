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


@router.post("/videos")
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Upload a video to MinIO and return the stored object location."""

    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only video uploads are allowed")

    file_obj = file.file
    file_obj.seek(0, 2)
    size = file_obj.tell()
    file_obj.seek(0)

    if size <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty upload is not allowed")

    try:
        object_name = storage.upload_file(
            file=file_obj,
            filename=file.filename or "video-upload",
            content_type=file.content_type,
            length=size,
            prefix=f"videos/{current_user.id}"
        )
    except Exception as exc:  # pragma: no cover - bubble up as HTTP error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return {
        "object_name": object_name,
        "size": size,
        "content_type": file.content_type,
        "url": f"/api/uploads/{object_name}",
    }


@router.post("/batch")
async def batch_upload_files(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Upload multiple files at once."""
    
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided")
    
    if len(files) > 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 10 files allowed per batch")
    
    uploaded_files = []
    errors = []
    
    for file in files:
        try:
            file_obj = file.file
            file_obj.seek(0, 2)
            size = file_obj.tell()
            file_obj.seek(0)
            
            if size <= 0:
                errors.append({"filename": file.filename, "error": "Empty file"})
                continue
            
            # Determine prefix based on content type
            if file.content_type and file.content_type.startswith("image/"):
                prefix = f"images/{current_user.id}"
            elif file.content_type and file.content_type.startswith("video/"):
                prefix = f"videos/{current_user.id}"
            else:
                prefix = f"files/{current_user.id}"
            
            object_name = storage.upload_file(
                file=file_obj,
                filename=file.filename or "file-upload",
                content_type=file.content_type or "application/octet-stream",
                length=size,
                prefix=prefix
            )
            
            # Format file size
            size_mb = size / (1024 * 1024)
            if size_mb >= 1:
                size_str = f"{size_mb:.2f} MB"
            else:
                size_str = f"{size / 1024:.2f} KB"
            
            uploaded_files.append({
                "filename": file.filename,
                "object_name": object_name,
                "size": size,
                "size_formatted": size_str,
                "content_type": file.content_type,
                "url": f"/api/uploads/{object_name}",
            })
        except Exception as exc:
            errors.append({"filename": file.filename, "error": str(exc)})
    
    return {
        "uploaded": uploaded_files,
        "errors": errors,
        "total": len(files),
        "success_count": len(uploaded_files),
        "error_count": len(errors),
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
