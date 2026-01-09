"""Email management API endpoints for admin."""

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.app.db.session import get_db
from backend.app.models import (
    User, UserRole, EmailTemplate, EmailLog, ScheduledEmail, EmailStatus
)
from backend.app.core.security import get_current_user
from backend.app.services.gmail_service import gmail_service
from backend.app.services.scheduler import email_scheduler

router = APIRouter(prefix="/api/admin/email", tags=["email"])


# ================== Schemas ==================

class EmailTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    subject: str = Field(..., min_length=1, max_length=500)
    body: str = Field(..., min_length=1)
    variables: Optional[List[str]] = None


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    body: Optional[str] = None
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    id: int
    name: str
    subject: str
    body: str
    variables: Optional[List[str]] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RecipientConfig(BaseModel):
    """收件人配置"""
    type: str = Field(..., description="all | role | users")
    role: Optional[str] = None  # For type=role
    user_ids: Optional[List[str]] = None  # For type=users


class SendEmailRequest(BaseModel):
    """立即发送邮件请求"""
    template_id: Optional[int] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    recipients: RecipientConfig


class ScheduleEmailRequest(BaseModel):
    """定时发送邮件请求"""
    template_id: Optional[int] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    recipients: RecipientConfig
    scheduled_at: datetime = Field(..., description="计划发送时间 (ISO format)")


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


# ================== Helper Functions ==================

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_recipients_from_config(db: Session, config: RecipientConfig) -> List[User]:
    """Get users based on recipient config."""
    query = db.query(User).filter(User.is_active == True, User.email.isnot(None))
    
    if config.type == "role" and config.role:
        query = query.filter(User.role == config.role)
    elif config.type == "users" and config.user_ids:
        query = query.filter(User.id.in_(config.user_ids))
    # else: "all" - no additional filter
    
    return query.all()


# ================== Template CRUD ==================

@router.get("/templates", response_model=List[EmailTemplateResponse])
async def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """获取所有邮件模版"""
    templates = db.query(EmailTemplate).order_by(EmailTemplate.created_at.desc()).all()
    
    # Parse variables JSON
    result = []
    for t in templates:
        data = EmailTemplateResponse.model_validate(t)
        if t.variables:
            try:
                data.variables = json.loads(t.variables)
            except:
                data.variables = []
        result.append(data)
    
    return result


@router.post("/templates", response_model=EmailTemplateResponse)
async def create_template(
    data: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """创建邮件模版"""
    # Check name uniqueness
    existing = db.query(EmailTemplate).filter(EmailTemplate.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template name already exists")
    
    template = EmailTemplate(
        name=data.name,
        subject=data.subject,
        body=data.body,
        variables=json.dumps(data.variables) if data.variables else None
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template


@router.get("/templates/{template_id}", response_model=EmailTemplateResponse)
async def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """获取单个模版"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    data = EmailTemplateResponse.model_validate(template)
    if template.variables:
        try:
            data.variables = json.loads(template.variables)
        except:
            data.variables = []
    
    return data


@router.put("/templates/{template_id}", response_model=EmailTemplateResponse)
async def update_template(
    template_id: int,
    data: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """更新邮件模版"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check name uniqueness if changing
    if data.name and data.name != template.name:
        existing = db.query(EmailTemplate).filter(EmailTemplate.name == data.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Template name already exists")
        template.name = data.name
    
    if data.subject is not None:
        template.subject = data.subject
    if data.body is not None:
        template.body = data.body
    if data.variables is not None:
        template.variables = json.dumps(data.variables)
    if data.is_active is not None:
        template.is_active = data.is_active
    
    db.commit()
    db.refresh(template)
    
    return template


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """删除邮件模版"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted"}


# ================== Send Emails ==================

@router.post("/send")
async def send_email_now(
    data: SendEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """立即发送邮件"""
    # Get subject and body
    subject = data.subject
    body = data.body
    
    if data.template_id:
        template = db.query(EmailTemplate).filter(EmailTemplate.id == data.template_id).first()
        if template:
            subject = subject or template.subject
            body = body or template.body
    
    if not subject or not body:
        raise HTTPException(status_code=400, detail="Subject and body are required")
    
    # Get recipients
    recipients = get_recipients_from_config(db, data.recipients)
    if not recipients:
        raise HTTPException(status_code=400, detail="No valid recipients found")
    
    # Send emails
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
        
        # Log the email
        log = EmailLog(
            template_id=data.template_id,
            sender_id=current_user.id,
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


@router.post("/schedule", response_model=ScheduledEmailResponse)
async def schedule_email(
    data: ScheduleEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """定时发送邮件"""
    # Get subject and body
    subject = data.subject
    body = data.body
    
    if data.template_id:
        template = db.query(EmailTemplate).filter(EmailTemplate.id == data.template_id).first()
        if template:
            subject = subject or template.subject
            body = body or template.body
    
    if not subject:
        raise HTTPException(status_code=400, detail="Subject is required")
    
    # Create scheduled email record
    scheduled = ScheduledEmail(
        template_id=data.template_id,
        sender_id=current_user.id,
        recipient_config=json.dumps(data.recipients.model_dump()),
        subject=subject,
        body=body,
        scheduled_at=data.scheduled_at,
        status=EmailStatus.PENDING
    )
    db.add(scheduled)
    db.commit()
    db.refresh(scheduled)
    
    # Schedule the job
    email_scheduler.schedule_email(
        scheduled_email_id=scheduled.id,
        run_at=data.scheduled_at,
        db_session_factory=get_db
    )
    
    return scheduled


@router.delete("/schedule/{scheduled_id}")
async def cancel_scheduled_email(
    scheduled_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """取消定时邮件"""
    scheduled = db.query(ScheduledEmail).filter(ScheduledEmail.id == scheduled_id).first()
    if not scheduled:
        raise HTTPException(status_code=404, detail="Scheduled email not found")
    
    if scheduled.status != EmailStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cannot cancel non-pending scheduled email")
    
    # Cancel the scheduler job
    email_scheduler.cancel_scheduled_email(scheduled_id)
    
    # Update status
    scheduled.status = EmailStatus.CANCELLED
    db.commit()
    
    return {"message": "Scheduled email cancelled"}


# ================== History ==================

@router.get("/history", response_model=List[EmailLogResponse])
async def get_email_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
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
