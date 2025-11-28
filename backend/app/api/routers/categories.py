"""Category management endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_admin
from backend.app.db.session import get_db
from backend.app.models import Category, User
from backend.app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate
from backend.app.services.operations import log_operation


router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("/", response_model=List[CategoryResponse])
async def list_categories(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """List categories with optional filters."""

    query = db.query(Category)
    if is_active is not None:
        query = query.filter(Category.is_active == is_active)
    return query.order_by(Category.order, Category.id).offset(skip).limit(limit).all()


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: int, db: Session = Depends(get_db)):
    """Fetch a single category by ID."""

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new category (admin only)."""

    existing = (
        db.query(Category)
        .filter((Category.name == category_data.name) | (Category.slug == category_data.slug))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name or slug already exists",
        )

    new_category = Category(**category_data.dict())
    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    log_operation(
        db=db,
        user_id=current_admin.id,
        action="CATEGORY_CREATE",
        resource_type="category",
        resource_id=str(new_category.id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )

    return new_category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a category (admin only)."""

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    for field, value in category_data.dict(exclude_unset=True).items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    log_operation(
        db=db,
        user_id=current_admin.id,
        action="CATEGORY_UPDATE",
        resource_type="category",
        resource_id=str(category_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )

    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a category if it has no resources (admin only)."""

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if category.resources:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with resources",
        )

    db.delete(category)
    db.commit()

    log_operation(
        db=db,
        user_id=current_admin.id,
        action="CATEGORY_DELETE",
        resource_type="category",
        resource_id=str(category_id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )
