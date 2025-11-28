"""Payment QR code management endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.app.db.session import get_db
from backend.app.models import User, UserRole, PaymentQRCode
from backend.app.schemas import (
    PaymentQRCodeCreate,
    PaymentQRCodeUpdate,
    PaymentQRCodeResponse,
)


router = APIRouter(prefix="/api/payment", tags=["Payment"])


@router.get("/qrcodes", response_model=List[PaymentQRCodeResponse])
async def get_payment_qrcodes(
    db: Session = Depends(get_db),
):
    """Get all active payment QR codes (public endpoint)."""
    qrcodes = db.query(PaymentQRCode).filter(PaymentQRCode.is_active == True).all()
    return qrcodes


@router.post("/qrcodes", response_model=PaymentQRCodeResponse)
async def create_payment_qrcode(
    qrcode_data: PaymentQRCodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update payment QR code (Admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage payment QR codes",
        )

    # Check if QR code for this payment method already exists
    existing = db.query(PaymentQRCode).filter(
        PaymentQRCode.payment_method == qrcode_data.payment_method
    ).first()

    if existing:
        # Update existing
        existing.qr_code_url = qrcode_data.qr_code_url
        existing.description = qrcode_data.description
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        new_qrcode = PaymentQRCode(
            payment_method=qrcode_data.payment_method,
            qr_code_url=qrcode_data.qr_code_url,
            description=qrcode_data.description,
            is_active=True,
        )
        db.add(new_qrcode)
        db.commit()
        db.refresh(new_qrcode)
        return new_qrcode


@router.put("/qrcodes/{qrcode_id}", response_model=PaymentQRCodeResponse)
async def update_payment_qrcode(
    qrcode_id: int,
    qrcode_data: PaymentQRCodeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update payment QR code (Admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage payment QR codes",
        )

    qrcode = db.query(PaymentQRCode).filter(PaymentQRCode.id == qrcode_id).first()
    if not qrcode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment QR code not found",
        )

    if qrcode_data.qr_code_url is not None:
        qrcode.qr_code_url = qrcode_data.qr_code_url
    if qrcode_data.is_active is not None:
        qrcode.is_active = qrcode_data.is_active
    if qrcode_data.description is not None:
        qrcode.description = qrcode_data.description

    db.commit()
    db.refresh(qrcode)
    return qrcode


@router.delete("/qrcodes/{qrcode_id}")
async def delete_payment_qrcode(
    qrcode_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete payment QR code (Admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage payment QR codes",
        )

    qrcode = db.query(PaymentQRCode).filter(PaymentQRCode.id == qrcode_id).first()
    if not qrcode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment QR code not found",
        )

    db.delete(qrcode)
    db.commit()
    return {"message": "Payment QR code deleted successfully"}
