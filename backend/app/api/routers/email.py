"""Email management API endpoints for admin."""

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.app.core.security import get_current_admin
from backend.app.db.session import get_db
from backend.app.models import (
    User, UserRole, EmailTemplate, EmailLog, ScheduledEmail, EmailStatus
)

router = APIRouter(prefix="/api/admin/email", tags=["Email"])


# ================== Schemas ==================

class EmailTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    subject: str = Field(..., min_length=1, max_length=500)
    body: str = Field(..., min_length=1)


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    body: Optional[str] = None
    is_active: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    id: int
    name: str
    subject: str
    body: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RecipientConfig(BaseModel):
    """收件人配置"""
    type: str = Field(..., description="all | role | users")
    role: Optional[str] = None
    user_ids: Optional[List[str]] = None


class SendEmailRequest(BaseModel):
    """发送邮件请求"""
    template_id: Optional[int] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    recipients: RecipientConfig


class EmailLogResponse(BaseModel):
    id: int
    template_id: Optional[int]
    sender_id: str
    recipient_email: str
    recipient_user_id: Optional[str]
    subject: str
    status: str
    error_message: Optional[str]
    sent_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ScheduledEmailResponse(BaseModel):
    id: int
    template_id: Optional[int]
    sender_id: str
    subject: str
    recipient_config: str
    scheduled_at: datetime
    status: str
    executed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ================== Template CRUD ==================

@router.get("/templates", response_model=List[EmailTemplateResponse])
async def list_templates(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取所有邮件模版"""
    templates = db.query(EmailTemplate).order_by(EmailTemplate.created_at.desc()).all()
    return templates


@router.post("/templates", response_model=EmailTemplateResponse)
async def create_template(
    data: EmailTemplateCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """创建邮件模版"""
    existing = db.query(EmailTemplate).filter(EmailTemplate.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template name already exists")
    
    template = EmailTemplate(
        name=data.name,
        subject=data.subject,
        body=data.body
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template


@router.get("/templates/{template_id}", response_model=EmailTemplateResponse)
async def get_template(
    template_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取单个模版"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/templates/{template_id}", response_model=EmailTemplateResponse)
async def update_template(
    template_id: int,
    data: EmailTemplateUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """更新邮件模版"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if data.name and data.name != template.name:
        existing = db.query(EmailTemplate).filter(EmailTemplate.name == data.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Template name already exists")
        template.name = data.name
    
    if data.subject is not None:
        template.subject = data.subject
    if data.body is not None:
        template.body = data.body
    if data.is_active is not None:
        template.is_active = data.is_active
    
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """删除邮件模版"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}


# ================== Send Emails ==================

def get_recipients_from_config(db: Session, config: RecipientConfig) -> List[User]:
    """Get users based on recipient config."""
    query = db.query(User).filter(User.is_active == True, User.email.isnot(None))
    
    if config.type == "role" and config.role:
        query = query.filter(User.role == config.role)
    elif config.type == "users" and config.user_ids:
        query = query.filter(User.id.in_(config.user_ids))
    
    return query.all()


@router.post("/send")
async def send_email_now(
    data: SendEmailRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """立即发送邮件"""
    subject = data.subject
    body = data.body
    
    if data.template_id:
        template = db.query(EmailTemplate).filter(EmailTemplate.id == data.template_id).first()
        if template:
            subject = subject or template.subject
            body = body or template.body
    
    if not subject or not body:
        raise HTTPException(status_code=400, detail="Subject and body are required")
    
    recipients = get_recipients_from_config(db, data.recipients)
    if not recipients:
        raise HTTPException(status_code=400, detail="No valid recipients found")
    
    # 尝试导入 Gmail 服务
    try:
        from backend.app.services.gmail_service import gmail_service
    except ImportError as e:
        # Gmail 服务不可用，记录日志并返回错误
        for user in recipients:
            log = EmailLog(
                template_id=data.template_id,
                sender_id=current_admin.id,
                recipient_email=user.email,
                recipient_user_id=user.id,
                subject=subject,
                body=body,
                status=EmailStatus.FAILED,
                error_message=f"Gmail service import failed: {e}"
            )
            db.add(log)
        db.commit()
        raise HTTPException(status_code=503, detail=f"Gmail service not available: {e}")
    
    # 发送邮件
    sent_count = 0
    failed_count = 0
    
    for user in recipients:
        variables = {
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name or user.username
        }
        
        result = await gmail_service.send_email(
            to=user.email,
            subject=subject,
            body=body,
            variables=variables
        )
        
        # 记录日志
        log = EmailLog(
            template_id=data.template_id,
            sender_id=current_admin.id,
            recipient_email=user.email,
            recipient_user_id=user.id,
            subject=gmail_service.replace_variables(subject, variables),
            body=gmail_service.replace_variables(body, variables),
            status=EmailStatus.SENT if result["success"] else EmailStatus.FAILED,
            error_message=result.get("error"),
            sent_at=datetime.utcnow() if result["success"] else None
        )
        db.add(log)
        
        if result["success"]:
            sent_count += 1
        else:
            failed_count += 1
    
    db.commit()
    
    return {
        "message": f"Sent {sent_count} emails, {failed_count} failed",
        "sent": sent_count,
        "failed": failed_count,
        "total": len(recipients)
    }


# ================== History ==================

@router.get("/history", response_model=List[EmailLogResponse])
async def get_email_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取邮件发送历史"""
    query = db.query(EmailLog).order_by(EmailLog.created_at.desc())
    
    if status:
        query = query.filter(EmailLog.status == status)
    
    logs = query.offset(offset).limit(limit).all()
    return logs


@router.get("/scheduled", response_model=List[ScheduledEmailResponse])
async def get_scheduled_emails(
    status: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取定时邮件列表"""
    query = db.query(ScheduledEmail).order_by(ScheduledEmail.scheduled_at.desc())
    
    if status:
        query = query.filter(ScheduledEmail.status == status)
    
    return query.all()


# ================== Users for Selection ==================

@router.get("/users")
async def get_users_for_email(
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取可发送邮件的用户列表"""
    query = db.query(User).filter(User.is_active == True, User.email.isnot(None))
    
    if role:
        query = query.filter(User.role == role)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search_term)) |
            (User.email.ilike(search_term)) |
            (User.full_name.ilike(search_term))
        )
    
    users = query.order_by(User.created_at.desc()).limit(100).all()
    
    return [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role.value
    } for u in users]
