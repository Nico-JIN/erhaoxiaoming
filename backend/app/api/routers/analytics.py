from typing import Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.analytics import analytics_service
from backend.app.core.security import get_current_user_optional
from backend.app.models import User

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

class VisitRequest(BaseModel):
    page_path: str
    referrer: Optional[str] = None

@router.post("/visit")
async def track_visit(
    visit_data: VisitRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Track a page visit."""
    session_id = request.cookies.get("session_id") or "unknown"
    ip_address = request.client.host if request.client else "0.0.0.0"
    user_agent = request.headers.get("user-agent", "")
    
    analytics_service.track_page_view(
        db=db,
        session_id=session_id,
        page_path=visit_data.page_path,
        ip_address=ip_address,
        user_agent=user_agent,
        user_id=current_user.id if current_user else None,
        referrer=visit_data.referrer,
    )
    return {"status": "ok"}
