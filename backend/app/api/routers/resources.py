"""Resource management endpoints."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_admin, get_current_user, get_current_user_optional
from backend.app.db.session import get_db
from backend.app.models import Resource, ResourceStatus, User
from backend.app.schemas import ResourceCreate, ResourceListResponse, ResourceResponse, ResourceUpdate
from backend.app.services.operations import log_operation
from backend.app.services.points import deduct_points
from backend.app.services.storage import storage
from backend.app.utils.text import create_slug


router = APIRouter(prefix="/api/resources", tags=["Resources"])


@router.get("/", response_model=List[ResourceListResponse])
async def list_resources(
    skip: int = 0,
    limit: int = 50,
    category_id: Optional[int] = None,
    is_free: Optional[bool] = None,
    status: Optional[ResourceStatus] = None,
    search: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_pinned: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """List published resources with optional filters."""

    query = db.query(Resource).filter(Resource.status == ResourceStatus.PUBLISHED)

    if status:
        query = query.filter(Resource.status == status)
    if category_id:
        query = query.filter(Resource.category_id == category_id)
    if is_free is not None:
        query = query.filter(Resource.is_free == is_free)
    if search:
        query = query.filter(Resource.title.contains(search))
    if is_featured is not None:
        query = query.filter(Resource.is_featured == is_featured)
    if is_pinned is not None:
        query = query.filter(Resource.is_pinned == is_pinned)

    order_column = func.coalesce(Resource.published_at, Resource.created_at)
    return (
        query.order_by(order_column.desc(), Resource.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/hot", response_model=List[ResourceListResponse])
async def get_hot_resources(limit: int = 6, db: Session = Depends(get_db)):
    """Return featured or most downloaded resources for homepage display."""

    order_column = func.coalesce(Resource.pinned_at, Resource.published_at, Resource.created_at)
    query = (
        db.query(Resource)
        .filter(Resource.status == ResourceStatus.PUBLISHED)
        .order_by(
            Resource.is_pinned.desc(),
            order_column.desc(),
            Resource.is_featured.desc(),
            Resource.downloads.desc(),
        )
        .limit(limit)
    )
    return query.all()


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: str,  # UUID
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Retrieve a resource by ID."""

    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    resource.views += 1
    db.commit()
    
    # Check if user has purchased this resource or is admin
    if current_user and not resource.is_free and resource.points_required > 0:
        from backend.app.models import PointTransaction, TransactionType, UserRole
        
        # Admins always have access
        if current_user.role == UserRole.ADMIN:
            resource.is_purchased_by_user = True
        else:
            existing_purchase = (
                db.query(PointTransaction)
                .filter(
                    PointTransaction.user_id == current_user.id,
                    PointTransaction.type == TransactionType.PURCHASE,
                    PointTransaction.reference_id == f"resource_{resource.id}",
                )
                .first()
            )
            
            # Add a flag to indicate if user has already purchased
            # This will be available in the response via the schema
            resource.is_purchased_by_user = bool(existing_purchase)
    else:
        resource.is_purchased_by_user = False
    
    # Get like and comment counts
    from backend.app.models import Comment, ResourceLike
    
    resource.like_count = db.query(ResourceLike).filter(ResourceLike.resource_id == resource.id).count()
    resource.comment_count = db.query(Comment).filter(Comment.resource_id == resource.id).count()
    
    # Check if current user has liked
    if current_user:
        user_like = (
            db.query(ResourceLike)
            .filter(ResourceLike.user_id == current_user.id, ResourceLike.resource_id == resource.id)
            .first()
        )
        resource.is_liked_by_user = bool(user_like)
    else:
        resource.is_liked_by_user = False
    
    return resource


@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    resource_data: ResourceCreate,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a resource (admin only)."""

    slug = create_slug(resource_data.title)
    counter = 1
    original_slug = slug
    while db.query(Resource).filter(Resource.slug == slug).first():
        slug = f"{original_slug}-{counter}"
        counter += 1

    new_resource = Resource(
        **resource_data.dict(),
        slug=slug,
        author_id=current_admin.id,
        status=ResourceStatus.PUBLISHED,
        published_at=datetime.utcnow(),
    )

    if resource_data.is_pinned:
        new_resource.pinned_at = datetime.utcnow()

    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)

    log_operation(
        db=db,
        user_id=current_admin.id,
        action="RESOURCE_CREATE",
        resource_type="resource",
        resource_id=str(new_resource.id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )

    return new_resource


@router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: str,  # UUID
    resource_data: ResourceUpdate,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a resource (admin only)."""

    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    update_data = resource_data.dict(exclude_unset=True)
    is_pinned_value = update_data.pop("is_pinned", None)

    for field, value in update_data.items():
        setattr(resource, field, value)

    if is_pinned_value is not None:
        resource.is_pinned = is_pinned_value
        resource.pinned_at = datetime.utcnow() if is_pinned_value else None

    db.commit()
    db.refresh(resource)

    log_operation(
        db=db,
        user_id=current_admin.id,
        action="RESOURCE_UPDATE",
        resource_type="resource",
        resource_id=str(resource_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )

    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str,  # UUID
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a resource (admin only)."""

    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    if resource.file_url and not resource.file_url.startswith("http"):
        try:
            storage.delete_file(resource.file_url)
        except Exception as exc:  # pragma: no cover
            print(f"Error deleting file: {exc}")

    if resource.thumbnail_url and not resource.thumbnail_url.startswith("http"):
        try:
            storage.delete_file(resource.thumbnail_url)
        except Exception as exc:  # pragma: no cover
            print(f"Error deleting thumbnail: {exc}")

    db.delete(resource)
    db.commit()

    log_operation(
        db=db,
        user_id=current_admin.id,
        action="RESOURCE_DELETE",
        resource_type="resource",
        resource_id=str(resource_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )


@router.post("/{resource_id}/upload", response_model=ResourceResponse)
async def upload_resource_file(
    resource_id: str,  # UUID
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Upload or replace a resource file (admin only)."""

    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    file_obj = file.file
    file_obj.seek(0, 2)
    file_size_bytes = file_obj.tell()
    file_obj.seek(0)

    if file_size_bytes <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload")

    try:
        if resource.file_url and not resource.file_url.startswith("http"):
            try:
                storage.delete_file(resource.file_url)
            except Exception as exc:  # pragma: no cover
                print(f"Error clearing old file: {exc}")

        file_url = storage.upload_file(
            file_obj,
            file.filename or "attachment.bin",
            file.content_type,
            file_size_bytes,
            prefix=f"resources/{resource_id}",
        )
        resource.file_url = file_url
        extension = (file.filename or "").split(".")[-1] if file.filename and "." in file.filename else "bin"
        resource.file_type = extension.upper()
        resource.file_size = f"{file_size_bytes / (1024 * 1024):.2f} MB"

        db.commit()
        db.refresh(resource)

        return resource
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {exc}",
        ) from exc


@router.get("/{resource_id}/download")
async def download_resource(
    resource_id: str,  # UUID
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download a resource (deduct points when necessary)."""

    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    # Admin users can download all resources for free
    from backend.app.models import PointTransaction, TransactionType, UserRole
    
    is_admin = current_user.role == UserRole.ADMIN
    
    # Check if resource is paid and user needs to pay
    if not resource.is_free and resource.points_required > 0 and not is_admin:
        # Check if user has already purchased this resource
        existing_purchase = (
            db.query(PointTransaction)
            .filter(
                PointTransaction.user_id == current_user.id,
                PointTransaction.type == TransactionType.PURCHASE,
                PointTransaction.reference_id == f"resource_{resource.id}",
            )
            .first()
        )

        # Only deduct points if user hasn't purchased before
        if not existing_purchase:
            if current_user.points < resource.points_required:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Insufficient points",
                )

            try:
                deduct_points(
                    db=db,
                    user=current_user,
                    amount=resource.points_required,
                    description=f"Downloaded resource: {resource.title}",
                    reference_id=f"resource_{resource.id}",
                )
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=str(exc),
                ) from exc

    resource.downloads += 1
    db.commit()
    db.refresh(resource)
    db.refresh(current_user)

    log_operation(
        db=db,
        user_id=current_user.id,
        action="RESOURCE_DOWNLOAD",
        resource_type="resource",
        resource_id=str(resource_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )

    if not resource.file_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    try:
        # Generate download URL
        if resource.file_url.startswith("http"):
            # External URL, use as-is
            download_url = resource.file_url
        else:
            # MinIO object, generate presigned URL
            download_url = storage.get_file_url(resource.file_url, expires=3600)
        
        return {
            "download_url": download_url,
            "balance": current_user.points,
            "downloads": resource.downloads,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating download URL: {exc}",
        ) from exc
