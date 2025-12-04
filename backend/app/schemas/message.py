from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    receiver_id: str

class Message(MessageBase):
    id: int
    sender_id: str
    receiver_id: str
    is_read: bool
    created_at: datetime
    
    sender_username: Optional[str] = None
    sender_avatar: Optional[str] = None

    class Config:
        from_attributes = True

class Conversation(BaseModel):
    peer_id: str
    peer_username: str
    peer_avatar: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
