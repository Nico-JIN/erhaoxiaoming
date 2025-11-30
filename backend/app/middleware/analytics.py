"""Analytics middleware for tracking page views."""

import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.db.session import SessionLocal
from backend.app.services.analytics import analytics_service


class AnalyticsMiddleware(BaseHTTPMiddleware):
    """Middleware to track all page visits."""

    async def dispatch(self, request: Request, call_next):
        """Track page view before processing request."""
        
        # Skip tracking for static files, health checks, and API calls (except resource views)
        skip_paths = ['/docs', '/redoc', '/openapi.json', '/health', '/static']
        if any(request.url.path.startswith(path) for path in skip_paths):
            return await call_next(request)
        
        # Get or create session ID from cookie
        session_id = request.cookies.get('session_id')
        if not session_id:
            session_id = uuid.uuid4().hex[:64]
        
        # Get user info
        user_id = None
        if hasattr(request.state, 'user') and request.state.user:
            user_id = request.state.user.id
        
        # Get request metadata
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        referrer = request.headers.get("referer")
        
        # Track page view in database
        db = SessionLocal()
        try:
            analytics_service.track_page_view(
                db=db,
                session_id=session_id,
                page_path=str(request.url.path),
                ip_address=ip_address,
                user_agent=user_agent,
                user_id=user_id,
                referrer=referrer,
            )
        except Exception as e:
            # Don't fail the request if analytics fails
            print(f"Analytics tracking error: {e}")
        finally:
            db.close()
        
        # Process request
        response = await call_next(request)
        
        # Set session cookie if not exists
        if not request.cookies.get('session_id'):
            response.set_cookie(
                key='session_id',
                value=session_id,
                max_age=30*24*60*60,  # 30 days
                httponly=True,
                samesite='lax'
            )
        
        return response
