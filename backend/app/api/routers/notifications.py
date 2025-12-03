"""通知管理 API"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.app.db.session import get_db
from backend.app.models import User, Notification, NotificationType
from backend.app.services import notification_service


router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    """通知响应模型"""
    id: int
    notification_type: str
    notification_type_cn: str  # 中文类型
    content: str
    is_read: bool
    created_at: str
    actor_username: str | None
    actor_avatar: str | None
    resource_id: str | None
    resource_title: str | None

    class Config:
        from_attributes = True


def translate_notification_type(ntype: NotificationType) -> str:
    """将通知类型转换为中文"""
    type_map = {
        NotificationType.LIKE: "点赞",
        NotificationType.COMMENT: "评论",
        NotificationType.REPLY: "回复",
        NotificationType.DOWNLOAD: "下载",
        NotificationType.VIEW: "阅读",
        NotificationType.MESSAGE: "私信",
    }
    return type_map.get(ntype, ntype.value)


@router.get("/stats")
async def get_notification_stats(
    unread_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取通知统计"""
    return notification_service.get_stats(db, current_user.id, unread_only)


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    skip: int = 0,
    limit: int = 20,
    notification_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取通知列表"""
    notifications = notification_service.get_user_notifications(
        db, 
        current_user.id, 
        skip, 
        limit,
        notification_type
    )
    
    result = []
    for notif in notifications:
        result.append({
            "id": notif.id,
            "notification_type": notif.notification_type.value,
            "notification_type_cn": translate_notification_type(notif.notification_type),
            "content": notif.content,
            "is_read": notif.is_read,
            "created_at": notif.created_at.isoformat() if notif.created_at else None,
            "actor_username": notif.actor.username if notif.actor else None,
            "actor_avatar": notif.actor.avatar_url if notif.actor else None,
            "resource_id": notif.resource_id,
            "resource_title": notif.resource.title if notif.resource else None,
        })
    
    return result


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取未读通知数量"""
    count = notification_service.get_unread_count(db, current_user.id)
    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """标记单个通知为已读"""
    success = notification_service.mark_as_read(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return {"message": "Notification marked as read"}


@router.put("/mark-all-read")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """标记所有通知为已读"""
    count = notification_service.mark_all_as_read(db, current_user.id)
    return {"message": f"Marked {count} notifications as read", "count": count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除通知"""
    success = notification_service.delete_notification(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return {"message": "Notification deleted"}
