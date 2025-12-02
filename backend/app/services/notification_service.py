from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models import Notification, NotificationType, User, Resource
from backend.app.schemas.notification import NotificationCreate

class NotificationService:
    def create_notification(
        self, 
        db: Session, 
        user_id: str,
        actor_id: str,
        notification_type: NotificationType,
        resource_id: Optional[str],
        content: str
    ) -> Notification:
        db_notification = Notification(
            user_id=user_id,
            actor_id=actor_id,
            notification_type=notification_type,
            resource_id=resource_id,
            content=content,
            is_read=False
        )
        db.add(db_notification)
        db.commit()
        db.refresh(db_notification)
        return db_notification

    def get_user_notifications(self, db: Session, user_id: str, skip: int = 0, limit: int = 20) -> List[Notification]:
        notifications = db.query(Notification)\
            .filter(Notification.user_id == user_id)\
            .order_by(Notification.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        # Enrich with actor and resource details if needed (though relationships handle this)
        # We can map to schema in the router or here. 
        # For now, return ORM objects.
        return notifications

    def get_unread_count(self, db: Session, user_id: str) -> int:
        return db.query(Notification)\
            .filter(Notification.user_id == user_id, Notification.is_read == False)\
            .count()

    def get_stats(self, db: Session, user_id: str, unread_only: bool = True) -> Dict[str, int]:
        """Get counts of notifications by type"""
        query = db.query(
            Notification.notification_type, 
            func.count(Notification.id)
        ).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
            
        stats = query.group_by(Notification.notification_type).all()
        
        result = {
            "total": 0,
            "like": 0,
            "comment": 0,
            "download": 0,
            "message": 0,
            "system": 0
        }
        
        for type_, count in stats:
            result["total"] += count
            if type_ == NotificationType.LIKE:
                result["like"] = count
            elif type_ == NotificationType.COMMENT or type_ == NotificationType.REPLY:
                result["comment"] += count
            elif type_ == NotificationType.DOWNLOAD:
                result["download"] += count
            elif type_ == NotificationType.MESSAGE:
                result["message"] = count
            else:
                result["system"] += count
                
        return result

    def mark_as_read(self, db: Session, notification_id: int, user_id: str) -> Optional[Notification]:
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            notification.is_read = True
            db.commit()
            db.refresh(notification)
        
        return notification

    def mark_all_as_read(self, db: Session, user_id: str) -> int:
        result = db.query(Notification).filter(
            Notification.user_id == user_id, 
            Notification.is_read == False
        ).update({Notification.is_read: True})
        db.commit()
        return result

notification_service = NotificationService()
