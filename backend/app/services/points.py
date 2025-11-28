"""Point-related domain services."""

from typing import Optional

from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models import PointTransaction, TransactionType, User


settings = get_settings()


def add_points(
    db: Session,
    user: User,
    amount: int,
    transaction_type: TransactionType,
    description: str,
    reference_id: Optional[str] = None,
) -> PointTransaction:
    """Add points to a user and persist the transaction."""

    user.points += amount
    if transaction_type == TransactionType.RECHARGE:
        user.total_recharged += amount

    transaction = PointTransaction(
        user_id=user.id,
        type=transaction_type,
        amount=amount,
        balance_after=user.points,
        description=description,
        reference_id=reference_id,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def deduct_points(
    db: Session,
    user: User,
    amount: int,
    description: str,
    reference_id: Optional[str] = None,
) -> PointTransaction:
    """Deduct points from a user."""

    if user.points < amount:
        raise ValueError("Insufficient points")

    user.points -= amount
    transaction = PointTransaction(
        user_id=user.id,
        type=TransactionType.PURCHASE,
        amount=-amount,
        balance_after=user.points,
        description=description,
        reference_id=reference_id,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def grant_register_reward(db: Session, user: User) -> None:
    """Grant default registration reward points to a new user."""

    reward_points = settings.REGISTER_REWARD_POINTS
    add_points(
        db=db,
        user=user,
        amount=reward_points,
        transaction_type=TransactionType.REGISTER,
        description=f"Registration reward: {reward_points} points",
    )
