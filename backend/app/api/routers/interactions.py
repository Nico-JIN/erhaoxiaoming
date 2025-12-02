"""Resource interactions (likes and comments) endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.app.db.session import get_db
from backend.app.models import Comment, Resource, ResourceLike, User, NotificationType
from backend.app.schemas import CommentCreate, CommentResponse, CommentUpdate, LikeResponse
from backend.app.services.operations import log_operation
from backend.app.services import notification_service


router = APIRouter(prefix="/api/interactions", tags=["Interactions"])


# ==================== Likes ====================

@router.post("/likes", response_model=LikeResponse, status_code=status.HTTP_201_CREATED)
async def create_like(
    resource_id: str,  # UUID
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Like a resource."""
    
    # Check if resource exists
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    
    # Check if already liked
    existing_like = (
        db.query(ResourceLike)
        .filter(ResourceLike.user_id == current_user.id, ResourceLike.resource_id == resource_id)
        .first()
    )
    
    if existing_like:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already liked")
    
    # Create new like
    new_like = ResourceLike(user_id=current_user.id, resource_id=resource_id)
    db.add(new_like)
    db.commit()
    db.refresh(new_like)
    
    # Log operation
    log_operation(
        db=db,
        user_id=current_user.id,
        action="RESOURCE_LIKE",
        resource_type="resource",
        resource_id=str(resource_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )
    
    # Create notification for all admins
    from backend.app.models import UserRole
    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    for admin in admins:
        if admin.id != current_user.id:
            notification_service.create_notification(
                db=db,
                user_id=admin.id,
                actor_id=current_user.id,
                notification_type=NotificationType.LIKE,
                resource_id=resource_id,
                content=f"{current_user.username} 点赞了文章《{resource.title}》"
            )
    
    # Add username to response
    response_like = LikeResponse(
        id=new_like.id,
        user_id=new_like.user_id,
        resource_id=new_like.resource_id,
        created_at=new_like.created_at,
        username=current_user.username
    )
    
    return response_like


@router.delete("/likes/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_like(
    resource_id: str,  # UUID
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unlike a resource."""
    
    like = (
        db.query(ResourceLike)
        .filter(ResourceLike.user_id == current_user.id, ResourceLike.resource_id == resource_id)
        .first()
    )
    
    if not like:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Like not found")
    
    db.delete(like)
    db.commit()
    
    # Log operation
    log_operation(
        db=db,
        user_id=current_user.id,
        action="RESOURCE_UNLIKE",
        resource_type="resource",
        resource_id=str(resource_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )


@router.get("/likes/{resource_id}", response_model=List[LikeResponse])
async def get_resource_likes(
    resource_id: str,  # UUID
    db: Session = Depends(get_db),
):
    """Get all likes for a resource."""
    
    likes = db.query(ResourceLike).filter(ResourceLike.resource_id == resource_id).all()
    
    # Enrich with usernames
    response_likes = []
    for like in likes:
        user = db.query(User).filter(User.id == like.user_id).first()
        response_likes.append(
            LikeResponse(
                id=like.id,
                user_id=like.user_id,
                resource_id=like.resource_id,
                created_at=like.created_at,
                username=user.username if user else None
            )
        )
    
    return response_likes


@router.get("/likes/{resource_id}/count", response_model=dict)
async def get_resource_like_count(
    resource_id: str,  # UUID
    db: Session = Depends(get_db),
):
    """Get the like count for a resource."""
    
    count = db.query(ResourceLike).filter(ResourceLike.resource_id == resource_id).count()
    return {"resource_id": resource_id, "like_count": count}


@router.get("/likes/{resource_id}/status", response_model=dict)
async def get_user_like_status(
    resource_id: str,  # UUID
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if current user has liked a resource."""
    
    like = (
        db.query(ResourceLike)
        .filter(ResourceLike.user_id == current_user.id, ResourceLike.resource_id == resource_id)
        .first()
    )
    
    return {"resource_id": resource_id, "liked": bool(like)}


# ==================== Comments ====================

@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a comment on a resource."""
    
    # Check if resource exists
    resource = db.query(Resource).filter(Resource.id == comment_data.resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    
    # If replying to a comment, check parent exists
    if comment_data.parent_id:
        parent = db.query(Comment).filter(Comment.id == comment_data.parent_id).first()
        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found")
    
    # Create comment
    new_comment = Comment(
        user_id=current_user.id,
        resource_id=comment_data.resource_id,
        content=comment_data.content,
        parent_id=comment_data.parent_id
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    # Log operation
    log_operation(
        db=db,
        user_id=current_user.id,
        action="RESOURCE_COMMENT",
        resource_type="resource",
        resource_id=str(comment_data.resource_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )
    
    # Create notification for all admins
    from backend.app.models import UserRole
    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    
    if comment_data.parent_id:
        # 回复评论 - 通知管理员
        for admin in admins:
            if admin.id != current_user.id:
                notification_service.create_notification(
                    db=db,
                    user_id=admin.id,
                    actor_id=current_user.id,
                    notification_type=NotificationType.REPLY,
                    resource_id=comment_data.resource_id,
                    content=f"{current_user.username} 回复了评论：{comment_data.content[:50]}..."
                )
    else:
        # 评论文章 - 通知管理员
        for admin in admins:
            if admin.id != current_user.id:
                notification_service.create_notification(
                    db=db,
                    user_id=admin.id,
                    actor_id=current_user.id,
                    notification_type=NotificationType.COMMENT,
                    resource_id=comment_data.resource_id,
                    content=f"{current_user.username} 评论了文章《{resource.title}》：{comment_data.content[:50]}..."
                )
    
    # Build response
    response_comment = CommentResponse(
        id=new_comment.id,
        user_id=new_comment.user_id,
        resource_id=new_comment.resource_id,
        content=new_comment.content,
        parent_id=new_comment.parent_id,
        created_at=new_comment.created_at,
        updated_at=new_comment.updated_at,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        replies=[]
    )
    
    return response_comment


@router.get("/comments/{resource_id}", response_model=List[CommentResponse])
async def get_resource_comments(
    resource_id: str,  # UUID
    db: Session = Depends(get_db),
):
    """Get all comments for a resource (including nested replies)."""
    
    # Get all top-level comments (no parent)
    top_comments = (
        db.query(Comment)
        .filter(Comment.resource_id == resource_id, Comment.parent_id == None)
        .order_by(Comment.created_at.desc())
        .all()
    )
    
    def build_comment_tree(comment: Comment) -> CommentResponse:
        """Recursively build comment with replies."""
        user = db.query(User).filter(User.id == comment.user_id).first()
        
        # Get replies
        replies = db.query(Comment).filter(Comment.parent_id == comment.id).order_by(Comment.created_at.asc()).all()
        reply_responses = [build_comment_tree(reply) for reply in replies]
        
        return CommentResponse(
            id=comment.id,
            user_id=comment.user_id,
            resource_id=comment.resource_id,
            content=comment.content,
            parent_id=comment.parent_id,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            username=user.username if user else None,
            avatar_url=user.avatar_url if user else None,
            replies=reply_responses
        )
    
    return [build_comment_tree(comment) for comment in top_comments]


@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a comment (only the author can update)."""
    
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this comment")
    
    comment.content = comment_data.content
    db.commit()
    db.refresh(comment)
    
    # Log operation
    log_operation(
        db=db,
        user_id=current_user.id,
        action="COMMENT_UPDATE",
        resource_type="comment",
        resource_id=str(comment_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )
    
    response_comment = CommentResponse(
        id=comment.id,
        user_id=comment.user_id,
        resource_id=comment.resource_id,
        content=comment.content,
        parent_id=comment.parent_id,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        replies=[]
    )
    
    return response_comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a comment (only the author can delete)."""
    
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this comment")
    
    db.delete(comment)
    db.commit()
    
    # Log operation
    log_operation(
        db=db,
        user_id=current_user.id,
        action="COMMENT_DELETE",
        resource_type="comment",
        resource_id=str(comment_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )
