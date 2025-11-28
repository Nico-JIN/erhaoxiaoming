"""Administrative endpoints."""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_admin
from backend.app.db.session import get_db
from backend.app.models import (
    OperationLog,
    PointTransaction,
    Resource,
    ResourceStatus,
    SystemConfig,
    TransactionType,
    User,
)
from backend.app.schemas import (
    DashboardStats,
    OperationLogResponse,
    ResourceListResponse,
    SystemConfigResponse,
    SystemConfigUpdate,
)
from backend.app.services.operations import log_operation


router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return aggregated dashboard statistics."""

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_revenue = (
        db.query(func.sum(PointTransaction.amount))
        .filter(PointTransaction.type == TransactionType.RECHARGE)
        .scalar()
        or 0
    )
    total_articles = db.query(func.count(Resource.id)).scalar() or 0

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    sixty_days_ago = datetime.utcnow() - timedelta(days=60)

    recent_users = (
        db.query(func.count(User.id)).filter(User.created_at >= thirty_days_ago).scalar() or 0
    )
    previous_users = (
        db.query(func.count(User.id))
        .filter(User.created_at >= sixty_days_ago, User.created_at < thirty_days_ago)
        .scalar()
        or 0
    )

    user_growth = (
        ((recent_users - previous_users) / previous_users * 100) if previous_users > 0 else 0
    )

    recent_revenue = (
        db.query(func.sum(PointTransaction.amount))
        .filter(
            PointTransaction.type == TransactionType.RECHARGE,
            PointTransaction.created_at >= thirty_days_ago,
        )
        .scalar()
        or 0
    )
    previous_revenue = (
        db.query(func.sum(PointTransaction.amount))
        .filter(
            PointTransaction.type == TransactionType.RECHARGE,
            PointTransaction.created_at >= sixty_days_ago,
            PointTransaction.created_at < thirty_days_ago,
        )
        .scalar()
        or 0
    )
    revenue_growth = (
        ((recent_revenue - previous_revenue) / previous_revenue * 100)
        if previous_revenue > 0
        else 0
    )

    return {
        "total_users": total_users,
        "total_revenue": total_revenue / 100,
        "total_articles": total_articles,
        "user_growth": round(user_growth, 2),
        "revenue_growth": round(revenue_growth, 2),
    }


@router.get("/logs", response_model=List[OperationLogResponse])
async def get_operation_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return paginated operation logs."""

    query = db.query(OperationLog)
    if user_id:
        query = query.filter(OperationLog.user_id == user_id)
    if action:
        query = query.filter(OperationLog.action == action)
    if resource_type:
        query = query.filter(OperationLog.resource_type == resource_type)
    return query.order_by(OperationLog.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/resources", response_model=List[ResourceListResponse])
async def admin_list_resources(
    skip: int = 0,
    limit: int = 100,
    status: Optional[ResourceStatus] = None,
    category_id: Optional[int] = None,
    author_id: Optional[int] = None,
    search: Optional[str] = None,
    is_pinned: Optional[bool] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return paginated resources with optional filters (admin only)."""

    query = db.query(Resource)
    if status:
        query = query.filter(Resource.status == status)
    if category_id:
        query = query.filter(Resource.category_id == category_id)
    if author_id:
        query = query.filter(Resource.author_id == author_id)
    if search:
        query = query.filter(Resource.title.contains(search))
    if is_pinned is not None:
        query = query.filter(Resource.is_pinned == is_pinned)

    order_column = func.coalesce(Resource.published_at, Resource.created_at)
    return (
        query.order_by(order_column.desc(), Resource.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/config", response_model=List[SystemConfigResponse])
async def get_system_configs(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return all system configs."""

    return db.query(SystemConfig).all()


@router.get("/config/{key}", response_model=SystemConfigResponse)
async def get_system_config(
    key: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return a single config by key."""

    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuration not found")
    return config


@router.put("/config/{key}", response_model=SystemConfigResponse)
async def update_system_config(
    key: str,
    config_data: SystemConfigUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update or create a config entry."""

    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if not config:
        config = SystemConfig(key=key, value=config_data.value)
        db.add(config)
    else:
        config.value = config_data.value

    db.commit()
    db.refresh(config)
    return config


@router.post("/config", response_model=SystemConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_system_config(
    key: str,
    config_data: SystemConfigUpdate,
    description: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new config entry."""

    existing = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Configuration already exists")

    config = SystemConfig(key=key, value=config_data.value, description=description)
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


class BatchDeleteUsersRequest(BaseModel):
    user_ids: List[str]


class BatchDeleteResourcesRequest(BaseModel):
    resource_ids: List[str]


@router.post("/users/batch-delete", status_code=status.HTTP_200_OK)
async def batch_delete_users(
    batch_request: BatchDeleteUsersRequest,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Batch delete users by IDs (admin only)."""
    
    if not batch_request.user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No user IDs provided"
        )
    
    deleted_count = 0
    errors = []
    
    for user_id in batch_request.user_ids:
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                errors.append(f"User {user_id} not found")
                continue
            
            # Prevent deleting current admin
            if user.id == current_admin.id:
                errors.append(f"Cannot delete yourself (user {user_id})")
                continue
            
            db.delete(user)
            deleted_count += 1
            
            # Log the operation
            log_operation(
                db=db,
                user_id=current_admin.id,
                action="USER_BATCH_DELETE",
                resource_type="user",
                resource_id=str(user_id),
                ip_address=request.client.host if request.client else "0.0.0.0",
                user_agent=request.headers.get("user-agent", ""),
            )
        except Exception as e:
            errors.append(f"Error deleting user {user_id}: {str(e)}")
            continue
    
    db.commit()
    
    return {
        "deleted_count": deleted_count,
        "total_requested": len(batch_request.user_ids),
        "errors": errors if errors else None,
        "message": f"Successfully deleted {deleted_count} users"
    }


@router.post("/resources/batch-delete", status_code=status.HTTP_200_OK)
async def batch_delete_resources(
    batch_request: BatchDeleteResourcesRequest,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Batch delete resources/articles by IDs (admin only)."""
    
    if not batch_request.resource_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No resource IDs provided"
        )
    
    deleted_count = 0
    errors = []
    
    for resource_id in batch_request.resource_ids:
        try:
            resource = db.query(Resource).filter(Resource.id == resource_id).first()
            if not resource:
                errors.append(f"Resource {resource_id} not found")
                continue
            
            db.delete(resource)
            deleted_count += 1
            
            # Log the operation
            log_operation(
                db=db,
                user_id=current_admin.id,
                action="RESOURCE_BATCH_DELETE",
                resource_type="resource",
                resource_id=str(resource_id),
                ip_address=request.client.host if request.client else "0.0.0.0",
                user_agent=request.headers.get("user-agent", ""),
            )
        except Exception as e:
            errors.append(f"Error deleting resource {resource_id}: {str(e)}")
            continue
    
    db.commit()
    
    return {
        "deleted_count": deleted_count,
        "total_requested": len(batch_request.resource_ids),
        "errors": errors if errors else None,
        "message": f"Successfully deleted {deleted_count} resources"
    }
