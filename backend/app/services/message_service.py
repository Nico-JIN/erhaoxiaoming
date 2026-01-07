from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from backend.app.models import Message, User
from backend.app.schemas.message import MessageCreate

class MessageService:
    def send_message(self, db: Session, sender_id: str, message_in: MessageCreate) -> Message:
        db_message = Message(
            sender_id=sender_id,
            receiver_id=message_in.receiver_id,
            content=message_in.content,
            is_read=False
        )
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        return db_message

    def get_conversations(self, db: Session, user_id: str) -> List[Dict[str, Any]]:
        """
        Get a list of conversations for the user.
        This is a bit complex in SQL. We need to find all unique users communicated with,
        and get the last message and unread count for each.
        """
        # Subquery to find the latest message ID for each conversation pair
        # This is a simplified approach: find all messages involving the user
        
        # 1. Find all users who have exchanged messages with current user
        sent_to = db.query(Message.receiver_id).filter(Message.sender_id == user_id).distinct()
        received_from = db.query(Message.sender_id).filter(Message.receiver_id == user_id).distinct()
        
        contact_ids = set([r[0] for r in sent_to.all()] + [r[0] for r in received_from.all()])
        
        conversations = []
        for contact_id in contact_ids:
            contact = db.query(User).filter(User.id == contact_id).first()
            if not contact:
                continue
                
            # Get last message
            last_msg = db.query(Message).filter(
                or_(
                    and_(Message.sender_id == user_id, Message.receiver_id == contact_id),
                    and_(Message.sender_id == contact_id, Message.receiver_id == user_id)
                )
            ).order_by(Message.created_at.desc()).first()
            
            # Get unread count (messages from contact to user that are unread)
            unread = db.query(Message).filter(
                Message.sender_id == contact_id,
                Message.receiver_id == user_id,
                Message.is_read == False
            ).count()
            
            conversations.append({
                "peer_id": contact.id,
                "peer_username": contact.username,
                "peer_avatar": contact.avatar_url,
                "last_message": last_msg.content if last_msg else "",
                "last_message_at": last_msg.created_at if last_msg else None,
                "unread_count": unread
            })
            
        # Sort by last message time
        conversations.sort(key=lambda x: x["last_message_at"] or datetime.min, reverse=True)
        return conversations

    def get_messages(self, db: Session, user_id: str, other_user_id: str, skip: int = 0, limit: int = 50) -> List[Message]:
        messages = db.query(Message).filter(
            or_(
                and_(Message.sender_id == user_id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == user_id)
            )
        ).order_by(Message.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
        
        # Mark received messages as read
        unread_ids = [m.id for m in messages if m.receiver_id == user_id and not m.is_read]
        if unread_ids:
            db.query(Message).filter(Message.id.in_(unread_ids)).update({Message.is_read: True}, synchronize_session=False)
            db.commit()
            
        return messages

    def get_unread_count(self, db: Session, user_id: str) -> int:
        """Get total count of unread messages for a user."""
        return db.query(Message).filter(
            Message.receiver_id == user_id,
            Message.is_read == False
        ).count()

message_service = MessageService()

