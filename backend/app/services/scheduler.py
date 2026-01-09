"""APScheduler-based email scheduler service."""

import json
from datetime import datetime
from typing import Optional, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from sqlalchemy.orm import Session

from backend.app.models import (
    ScheduledEmail, EmailLog, EmailTemplate, User, EmailStatus, UserRole
)
from backend.app.services.gmail_service import gmail_service


class EmailScheduler:
    """Email scheduler using APScheduler."""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._started = False
    
    def start(self):
        """Start the scheduler."""
        if not self._started:
            self.scheduler.start()
            self._started = True
            print("[EmailScheduler] Started")
    
    def shutdown(self):
        """Shutdown the scheduler."""
        if self._started:
            self.scheduler.shutdown()
            self._started = False
            print("[EmailScheduler] Shutdown")
    
    async def execute_scheduled_email(
        self,
        scheduled_email_id: int,
        db_session_factory
    ):
        """Execute a scheduled email task."""
        from backend.app.db.session import get_db
        
        db: Session = next(db_session_factory())
        try:
            # Get scheduled email
            scheduled = db.query(ScheduledEmail).filter(
                ScheduledEmail.id == scheduled_email_id
            ).first()
            
            if not scheduled or scheduled.status != EmailStatus.PENDING:
                print(f"[EmailScheduler] Task {scheduled_email_id} not found or not pending")
                return
            
            # Parse recipient config
            config = json.loads(scheduled.recipient_config)
            recipient_type = config.get("type", "all")
            
            # Get recipients based on config
            query = db.query(User).filter(User.is_active == True, User.email.isnot(None))
            
            if recipient_type == "role":
                role = config.get("role", "USER")
                query = query.filter(User.role == role)
            elif recipient_type == "users":
                user_ids = config.get("user_ids", [])
                if user_ids:
                    query = query.filter(User.id.in_(user_ids))
            # else: "all" - no additional filter
            
            users = query.all()
            
            # Get template if specified
            subject = scheduled.subject
            body = scheduled.body
            
            if scheduled.template_id:
                template = db.query(EmailTemplate).filter(
                    EmailTemplate.id == scheduled.template_id
                ).first()
                if template:
                    subject = subject or template.subject
                    body = body or template.body
            
            # Send emails
            sent_count = 0
            failed_count = 0
            
            for user in users:
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
                    template_id=scheduled.template_id,
                    sender_id=scheduled.sender_id,
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
            
            # Update scheduled email status
            scheduled.status = EmailStatus.SENT if failed_count == 0 else EmailStatus.FAILED
            scheduled.executed_at = datetime.utcnow()
            if failed_count > 0:
                scheduled.error_message = f"Sent: {sent_count}, Failed: {failed_count}"
            
            db.commit()
            print(f"[EmailScheduler] Task {scheduled_email_id} completed: {sent_count} sent, {failed_count} failed")
            
        except Exception as e:
            print(f"[EmailScheduler] Error executing task {scheduled_email_id}: {e}")
            import traceback
            traceback.print_exc()
            
            # Mark as failed
            scheduled = db.query(ScheduledEmail).filter(
                ScheduledEmail.id == scheduled_email_id
            ).first()
            if scheduled:
                scheduled.status = EmailStatus.FAILED
                scheduled.error_message = str(e)
                scheduled.executed_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()
    
    def schedule_email(
        self,
        scheduled_email_id: int,
        run_at: datetime,
        db_session_factory
    ) -> str:
        """Schedule an email task.
        
        Returns:
            Job ID string
        """
        job_id = f"email_{scheduled_email_id}"
        
        self.scheduler.add_job(
            self.execute_scheduled_email,
            trigger=DateTrigger(run_date=run_at),
            args=[scheduled_email_id, db_session_factory],
            id=job_id,
            replace_existing=True
        )
        
        print(f"[EmailScheduler] Scheduled task {job_id} for {run_at}")
        return job_id
    
    def cancel_scheduled_email(self, scheduled_email_id: int) -> bool:
        """Cancel a scheduled email task.
        
        Returns:
            True if cancelled, False if not found
        """
        job_id = f"email_{scheduled_email_id}"
        
        try:
            self.scheduler.remove_job(job_id)
            print(f"[EmailScheduler] Cancelled task {job_id}")
            return True
        except Exception:
            return False
    
    def get_pending_jobs(self) -> List[dict]:
        """Get list of pending scheduled jobs."""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
            })
        return jobs


# Singleton instance
email_scheduler = EmailScheduler()
