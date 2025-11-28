"""User management endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_admin, get_current_user
from backend.app.db.session import get_db
from backend.app.models import User, UserRole
from backend.app.schemas import PointTransactionResponse, UserResponse, UserUpdate, UserRoleUpdate
from backend.app.services.operations import log_operation


router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""

    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's profile."""

    if user_update.full_name:
        current_user.full_name = user_update.full_name
    if user_update.avatar_url:
        current_user.avatar_url = user_update.avatar_url
    if user_update.email:
        existing = (
            db.query(User)
            .filter(User.email == user_update.email, User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )
        current_user.email = user_update.email
    if user_update.phone:
        existing = (
            db.query(User)
            .filter(User.phone == user_update.phone, User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already in use",
            )
        current_user.phone = user_update.phone

    db.commit()
    db.refresh(current_user)

    log_operation(
        db=db,
        user_id=current_user.id,
        action="USER_UPDATE_PROFILE",
        resource_type="user",
        resource_id=str(current_user.id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )

    return current_user


@router.get("/me/transactions", response_model=List[PointTransactionResponse])
async def get_user_transactions(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's point transactions."""

    transactions = (
        db.query(User).filter(User.id == current_user.id).first().point_transactions
    )
    return transactions[skip : skip + limit]


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List users (admin only)."""

    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.offset(skip).limit(limit).all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,  # UUID
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get a user by ID (admin only)."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,  # UUID
    role_data: UserRoleUpdate,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a user's role (admin only)."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    old_role = user.role
    user.role = role_data.role
    db.commit()
    db.refresh(user)

    log_operation(
        db=db,
        user_id=current_admin.id,
        action="ADMIN_UPDATE_USER_ROLE",
        resource_type="user",
        resource_id=str(user_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
        details=f"Changed role from {old_role} to {role_data.role}",
    )

    return user


@router.put("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,  # UUID
    is_active: bool,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Toggle a user's active status (admin only)."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = is_active
    db.commit()
    db.refresh(user)

    log_operation(
        db=db,
        user_id=current_admin.id,
        action="ADMIN_UPDATE_USER_STATUS",
        resource_type="user",
        resource_id=str(user_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
        details=f"Set active status to {is_active}",
    )

    return user
