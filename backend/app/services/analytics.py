"""Analytics and activity logging service."""

import json
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.models import ActionType, ActivityLog, VisitorAnalytics


def generate_session_id() -> str:
    """Generate a unique session identifier."""
    return uuid.uuid4().hex[:64]


class AnalyticsService:
    """Service for tracking visitor analytics and user activity."""

    @staticmethod
    def track_page_view(
        db: Session,
        session_id: str,
        page_path: str,
        ip_address: str,
        user_agent: str,
        user_id: Optional[str] = None,
        referrer: Optional[str] = None,
    ) -> VisitorAnalytics:
        """Track a page view."""
        analytics = VisitorAnalytics(
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            page_path=page_path,
            referrer=referrer,
        )
        db.add(analytics)
        db.commit()
        db.refresh(analytics)
        return analytics

    @staticmethod
    def log_activity(
        db: Session,
        action_type: ActionType,
        session_id: str,
        ip_address: str,
        user_agent: str,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> ActivityLog:
        """Log a user activity."""
        log = ActivityLog(
            user_id=user_id,
            session_id=session_id,
            action_type=action_type,
            resource_id=resource_id,
            action_metadata=json.dumps(metadata) if metadata else None,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def log_article_view(
        db: Session,
        resource_id: str,
        session_id: str,
        ip_address: str,
        user_agent: str,
        user_id: Optional[str] = None,
    ) -> ActivityLog:
        """Log an article view."""
        return AnalyticsService.log_activity(
            db=db,
            action_type=ActionType.ARTICLE_VIEW,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            resource_id=resource_id,
        )

    @staticmethod
    def log_download(
        db: Session,
        resource_id: str,
        session_id: str,
        ip_address: str,
        user_agent: str,
        user_id: Optional[str] = None,
        attachment_id: Optional[int] = None,
    ) -> ActivityLog:
        """Log a file download."""
        metadata = {"attachment_id": attachment_id} if attachment_id else None
        return AnalyticsService.log_activity(
            db=db,
            action_type=ActionType.DOWNLOAD,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            resource_id=resource_id,
            metadata=metadata,
        )

    @staticmethod
    def log_search(
        db: Session,
        query: str,
        session_id: str,
        ip_address: str,
        user_agent: str,
        user_id: Optional[str] = None,
        results_count: Optional[int] = None,
    ) -> ActivityLog:
        """Log a search query."""
        metadata = {"query": query, "results_count": results_count}
        return AnalyticsService.log_activity(
            db=db,
            action_type=ActionType.SEARCH,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            metadata=metadata,
        )


analytics_service = AnalyticsService()
