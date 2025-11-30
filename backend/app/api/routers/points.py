"""Point and transaction endpoints."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_admin, get_current_user
from backend.app.db.session import get_db
from backend.app.models import PointTransaction, TransactionType, User
from backend.app.schemas import (
    PointRecharge,
    PointTransactionCreate,
    PointTransactionResponse,
)
from backend.app.services.operations import log_operation
from backend.app.services.points import add_points


router = APIRouter(prefix="/api/points", tags=["Points"])


@router.post("/recharge", response_model=PointTransactionResponse)
async def recharge_points(
    recharge_data: PointRecharge,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Recharge user points (placeholder for payment integration)."""

    transaction = add_points(
        db=db,
        user=current_user,
        amount=recharge_data.amount,
        transaction_type=TransactionType.RECHARGE,
        description=f"Recharged {recharge_data.amount} points",
        reference_id=f"recharge_{current_user.id}_{int(datetime.utcnow().timestamp())}",
    )

    log_operation(
        db=db,
        user_id=current_user.id,
        action="POINT_RECHARGE",
        resource_type="transaction",
        resource_id=str(transaction.id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
        details=f"Recharged {recharge_data.amount} points",
    )

    return transaction


@router.get("/transactions", response_model=List[PointTransactionResponse])
async def get_transactions(
    skip: int = 0,
    limit: int = 50,
    transaction_type: Optional[TransactionType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return paginated transactions for the current user."""

    query = db.query(PointTransaction).filter(PointTransaction.user_id == current_user.id)
    if transaction_type:
        query = query.filter(PointTransaction.type == transaction_type)
    return query.order_by(PointTransaction.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/balance")
async def get_balance(current_user: User = Depends(get_current_user)):
    """Return the current user's balance."""

    return {
        "user_id": current_user.id,
        "balance": current_user.points,
        "total_recharged": current_user.total_recharged,
    }


@router.post("/admin/adjust", response_model=PointTransactionResponse)
async def admin_adjust_points(
    user_id: str,
    transaction_data: PointTransactionCreate,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Adjust a user's points (admin only)."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if transaction_data.amount < 0 and user.points < abs(transaction_data.amount):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has insufficient points",
        )

    transaction = add_points(
        db=db,
        user=user,
        amount=transaction_data.amount,
        transaction_type=TransactionType.ADMIN_ADJUST,
        description=transaction_data.description,
        reference_id=transaction_data.reference_id,
    )

    log_operation(
        db=db,
        user_id=current_admin.id,
        action="ADMIN_ADJUST_POINTS",
        resource_type="transaction",
        resource_id=str(transaction.id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
        details=f"Adjusted {transaction_data.amount} points for user {user_id}",
    )

    return transaction


@router.get("/admin/transactions", response_model=List[PointTransactionResponse])
async def admin_get_all_transactions(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    transaction_type: Optional[TransactionType] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return all transactions (admin only)."""

    query = db.query(PointTransaction)
    if user_id:
        query = query.filter(PointTransaction.user_id == user_id)
    if transaction_type:
        query = query.filter(PointTransaction.type == transaction_type)
    return query.order_by(PointTransaction.created_at.desc()).offset(skip).limit(limit).all()
