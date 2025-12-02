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
    ResourceStatsUpdate,
    VisitStatsResponse,
)
from backend.app.services.operations import log_operation



router = APIRouter(prefix="/api/admin", tags=["Admin"])


# 中文化辅助函数
def translate_action_to_chinese(action: str) -> str:
    """将操作类型转换为中文"""
    action_map = {
        # 用户操作
        "LOGIN": "登录",
        "LOGOUT": "登出",
        "REGISTER": "注册",
        "USER_UPDATE": "更新用户信息",
        "USER_DELETE": "删除用户",
        "USER_BATCH_DELETE": "批量删除用户",
        
        # 资源操作
        "RESOURCE_CREATE": "创建文章",
        "RESOURCE_UPDATE": "更新文章",
        "RESOURCE_DELETE": "删除文章",
        "RESOURCE_BATCH_DELETE": "批量删除文章",
        "RESOURCE_PUBLISH": "发布文章",
        "RESOURCE_VIEW": "浏览文章",
        "RESOURCE_DOWNLOAD": "下载资源",
        "RESOURCE_LIKE": "点赞文章",
        "RESOURCE_STATS_UPDATE": "更新文章统计",
        
        # 评论操作
        "COMMENT_CREATE": "发表评论",
        "COMMENT_DELETE": "删除评论",
        
        # 分类操作
        "CATEGORY_CREATE": "创建分类",
        "CATEGORY_UPDATE": "更新分类",
        "CATEGORY_DELETE": "删除分类",
        
        # 充值操作
        "RECHARGE_CREATE": "创建充值订单",
        "RECHARGE_APPROVE": "批准充值",
        "RECHARGE_REJECT": "拒绝充值",
        
        # 系统操作
        "CONFIG_UPDATE": "更新系统配置",
        "PAYMENT_QR_UPLOAD": "上传收款码",
    }
    return action_map.get(action, action)


def translate_resource_type_to_chinese(resource_type: str) -> str:
    """将资源类型转换为中文"""
    type_map = {
        "user": "用户",
        "resource": "文章",
        "comment": "评论",
        "category": "分类",
        "recharge": "充值",
        "config": "配置",
        "payment": "支付",
    }
    return type_map.get(resource_type, resource_type)


def translate_page_path_to_chinese(page_path: str) -> str:
    """将页面路径转换为中文描述"""
    if page_path == "/":
        return "首页"
    elif page_path.startswith("/article/"):
        return f"文章详情页 ({page_path})"
    elif page_path.startswith("/category/"):
        return f"分类页 ({page_path})"
    elif page_path == "/admin":
        return "后台管理"
    elif page_path == "/editor":
        return "编辑器"
    elif page_path == "/login":
        return "登录页"
    elif page_path == "/recharge":
        return "充值页"
    else:
        return page_path



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


@router.get("/logs")
async def get_operation_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return paginated operation logs with Chinese localization."""

    query = db.query(OperationLog)
    if user_id:
        query = query.filter(OperationLog.user_id == user_id)
    if action:
        query = query.filter(OperationLog.action == action)
    if resource_type:
        query = query.filter(OperationLog.resource_type == resource_type)
    
    logs = query.order_by(OperationLog.created_at.desc()).offset(skip).limit(limit).all()
    
    # 中文化日志数据
    localized_logs = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "username": log.user.username if log.user else "系统",
            "action": translate_action_to_chinese(log.action),
            "action_raw": log.action,  # 保留原始值以便筛选
            "resource_type": translate_resource_type_to_chinese(log.resource_type),
            "resource_type_raw": log.resource_type,  # 保留原始值以便筛选
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        localized_logs.append(log_dict)
    
    return localized_logs


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


@router.put("/resources/{resource_id}/stats", response_model=ResourceListResponse)
async def update_resource_stats(
    resource_id: str,
    stats_update: ResourceStatsUpdate,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update resource statistics (views/downloads)."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    if stats_update.views is not None:
        resource.views = stats_update.views
    if stats_update.downloads is not None:
        resource.downloads = stats_update.downloads

    db.commit()
    db.refresh(resource)
    
    log_operation(
        db=db,
        user_id=current_admin.id,
        action="RESOURCE_STATS_UPDATE",
        resource_type="resource",
        resource_id=str(resource_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
        details=f"Updated stats: views={stats_update.views}, downloads={stats_update.downloads}"
    )
    
    return resource


@router.get("/analytics/visits", response_model=VisitStatsResponse)
async def get_visit_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get website visit statistics."""
    from backend.app.models import VisitorAnalytics
    
    total_visits = db.query(func.count(VisitorAnalytics.id)).scalar() or 0
    unique_visitors = db.query(func.count(func.distinct(VisitorAnalytics.session_id))).scalar() or 0
    
    return {
        "total_visits": total_visits,
        "unique_visitors": unique_visitors,
        "avg_session_duration": 0  # Placeholder
    }


@router.get("/analytics/visitor-logs")
async def get_visitor_logs(
    skip: int = 0,
    limit: int = 50,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get detailed visitor logs with Chinese localization."""
    from backend.app.models import VisitorAnalytics
    
    total = db.query(func.count(VisitorAnalytics.id)).scalar() or 0
    
    logs = (
        db.query(VisitorAnalytics)
        .order_by(VisitorAnalytics.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return {
        "total": total,
        "logs": [
            {
                "id": log.id,
                "page_path": log.page_path,
                "page_path_cn": translate_page_path_to_chinese(log.page_path),  # 中文化页面路径
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "user_id": log.user_id,
                "username": log.user.username if log.user else "访客",
                "session_id": log.session_id,
                "referrer": log.referrer,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }
