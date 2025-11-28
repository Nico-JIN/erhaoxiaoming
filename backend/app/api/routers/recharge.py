"""Recharge plans management API routes."""

import secrets
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.app.db.session import get_db
from backend.app.models import RechargePlan, RechargeOrder, RechargeOrderStatus, User, UserRole, PointTransaction, TransactionType
from backend.app.schemas import (
    RechargePlanCreate,
    RechargePlanResponse,
    RechargePlanUpdate,
    RechargeOrderCreate,
    RechargeOrderResponse,
    RechargeOrderUpdate,
)

router = APIRouter(prefix="/api/recharge", tags=["Recharge"])


@router.get("/plans", response_model=List[RechargePlanResponse])
async def get_recharge_plans(
    db: Session = Depends(get_db),
    include_inactive: bool = False,
):
    """Get all recharge plans (public endpoint)."""
    query = db.query(RechargePlan)
    if not include_inactive:
        query = query.filter(RechargePlan.is_active == True)
    plans = query.order_by(RechargePlan.order).all()
    return plans


@router.post("/plans", response_model=RechargePlanResponse)
async def create_recharge_plan(
    plan_data: RechargePlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new recharge plan (Admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    plan = RechargePlan(
        name=plan_data.name,
        plan_type=plan_data.plan_type,
        points=plan_data.points,
        price=plan_data.price,
        description=plan_data.description,
        features=plan_data.features,
        is_active=plan_data.is_active,
        is_featured=plan_data.is_featured,
        order=plan_data.order,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/plans/{plan_id}", response_model=RechargePlanResponse)
async def update_recharge_plan(
    plan_id: int,
    plan_data: RechargePlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a recharge plan (Admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    plan = db.query(RechargePlan).filter(RechargePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Update fields
    update_data = plan_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}")
async def delete_recharge_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a recharge plan (Admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    plan = db.query(RechargePlan).filter(RechargePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    db.delete(plan)
    db.commit()
    return {"message": "Plan deleted successfully"}


# 订单管理
@router.post("/orders", response_model=RechargeOrderResponse)
async def create_recharge_order(
    order_data: RechargeOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建充值订单。"""
    # 生成订单号
    order_no = f"R{datetime.now().strftime('%Y%m%d%H%M%S')}{secrets.token_hex(4).upper()}"
    
    order = RechargeOrder(
        order_no=order_no,
        user_id=current_user.id,
        plan_id=order_data.plan_id,
        amount=order_data.amount,
        points=order_data.points,
        payment_method=order_data.payment_method,
        payment_proof=order_data.payment_proof,
        status=RechargeOrderStatus.PENDING,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders/my", response_model=List[RechargeOrderResponse])
async def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的充值订单。"""
    orders = db.query(RechargeOrder).filter(
        RechargeOrder.user_id == current_user.id
    ).order_by(RechargeOrder.created_at.desc()).all()
    return orders


@router.get("/orders", response_model=List[RechargeOrderResponse])
async def get_all_orders(
    status: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取所有充值订单（管理员）。"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(RechargeOrder)
    if status:
        query = query.filter(RechargeOrder.status == status)
    
    orders = query.order_by(RechargeOrder.created_at.desc()).all()
    return orders


@router.put("/orders/{order_id}", response_model=RechargeOrderResponse)
async def update_order_status(
    order_id: int,
    order_update: RechargeOrderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新订单状态（管理员）。"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    order = db.query(RechargeOrder).filter(RechargeOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # 更新订单状态
    if order_update.status:
        order.status = order_update.status
        order.approved_by = current_user.id
        order.approved_at = datetime.now()
        
        # 如果是批准，给用户加积分
        if order_update.status == RechargeOrderStatus.APPROVED:
            user = db.query(User).filter(User.id == order.user_id).first()
            if user:
                user.points += order.points
                user.total_recharged += order.amount
                
                # 创建积分交易记录
                transaction = PointTransaction(
                    user_id=user.id,
                    type=TransactionType.RECHARGE,
                    amount=order.points,
                    balance_after=user.points,
                    description=f"充值订单: {order.order_no}",
                    reference_id=order.order_no,
                )
                db.add(transaction)
                
                order.status = RechargeOrderStatus.COMPLETED
    
    if order_update.admin_note:
        order.admin_note = order_update.admin_note
    
    db.commit()
    db.refresh(order)
    return order
