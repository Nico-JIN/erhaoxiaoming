from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.services.message_service import message_service
from backend.app.schemas.message import Message, MessageCreate, Conversation
from backend.app.core.security import get_current_user
from backend.app.models import User

router = APIRouter(prefix="/api/messages", tags=["Messages"])

@router.post("", response_model=Message)
def send_message(
    message_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a private message"""
    if message_in.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")
        
    # Check if receiver exists
    receiver = db.query(User).filter(User.id == message_in.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
        
    message = message_service.send_message(db, current_user.id, message_in)
    
    # Notify all admins about the private message
    from backend.app.models import UserRole, NotificationType
    from backend.app.services import notification_service
    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    for admin in admins:
        if admin.id != current_user.id:
            notification_service.create_notification(
                db=db,
                user_id=admin.id,
                actor_id=current_user.id,
                notification_type=NotificationType.MESSAGE,
                resource_id=None,  # Private messages don't have a resource
                content=f"{current_user.username} 发送了私信给 {receiver.username}"
            )
    
    return message

@router.get("/conversations", response_model=List[Conversation])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List conversations (users you have chatted with)"""
    return message_service.get_conversations(db, current_user.id)

@router.get("/{other_user_id}", response_model=List[Message])
def get_messages(
    other_user_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get message history with a specific user"""
    return message_service.get_messages(db, current_user.id, other_user_id, skip, limit)
