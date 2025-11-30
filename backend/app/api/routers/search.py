"""Search API endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user_optional
from backend.app.db.session import get_db
from backend.app.models import Resource, ResourceStatus, User
from backend.app.services.analytics import analytics_service


router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("/resources")
async def search_resources(
    q: str = Query(..., min_length=1, description="Search query"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    limit: int = Query(20, le=100, description="Maximum results"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> List[dict]:
    """Search resources by title, description, tags, or content."""
    
    # Build query
    query = db.query(Resource).filter(Resource.status == ResourceStatus.PUBLISHED)
    
    # Search filter
    search_filter = or_(
        Resource.title.ilike(f"%{q}%"),
        Resource.description.ilike(f"%{q}%"),
        Resource.tags.ilike(f"%{q}%"),
        Resource.content.ilike(f"%{q}%"),
    )
    query = query.filter(search_filter)
    
    # Category filter
    if category_id:
        query = query.filter(Resource.category_id == category_id)
    
    # Execute query
    resources = query.order_by(Resource.views.desc()).limit(limit).all()
    
    # Log search activity
    try:
        session_id = "unknown"  # Would come from request cookie in middleware
        ip_address = "unknown"
        user_agent = "unknown"
        
        analytics_service.log_search(
            db=db,
            query=q,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=current_user.id if current_user else None,
            results_count=len(resources),
        )
    except Exception as e:
        print(f"Failed to log search: {e}")
    
    # Format results
    results = []
    for resource in resources:
        results.append({
            "id": resource.id,
            "title": resource.title,
            "description": resource.description,
            "thumbnail_url": resource.thumbnail_url,
            "category_name": resource.category_name,
            "category_slug": resource.category_slug,
            "author_username": resource.author_username,
            "views": resource.views,
            "is_free": resource.is_free,
            "points_required": resource.points_required,
            "tags": resource.tags_list,
            "created_at": resource.created_at.isoformat() if resource.created_at else None,
        })
    
    return results
