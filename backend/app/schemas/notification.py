from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from backend.app.models import NotificationType

class NotificationBase(BaseModel):
    notification_type: NotificationType
    content: str
    is_read: bool = False

class NotificationCreate(NotificationBase):
    user_id: str
    actor_id: Optional[str] = None
    resource_id: Optional[str] = None

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class Notification(NotificationBase):
    id: int
    user_id: str
    actor_id: Optional[str] = None
    resource_id: Optional[str] = None
    created_at: datetime
    
    # Optional expanded fields
    actor_username: Optional[str] = None
    actor_avatar: Optional[str] = None
    resource_title: Optional[str] = None

    class Config:
        orm_mode = True
