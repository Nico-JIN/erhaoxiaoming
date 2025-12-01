"""Pydantic schemas for API validation and responses."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from backend.app.models import (
    OAuthProvider,
    ResourceStatus,
    TransactionType,
    UserRole,
    RechargeOrderStatus,
)


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    username: str
    full_name: str
    avatar_url: Optional[str] = None


class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    username: str
    password: Optional[str] = Field(
        None,
        min_length=6,
        max_length=200,
        description="Password (6-200 characters, optional for OAuth)",
    )
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str = Field(..., max_length=200, description="Password (max 200 characters)")


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserResponse(BaseModel):
    id: str  # UUID
    email: Optional[str]
    phone: Optional[str]
    username: str
    full_name: str
    avatar_url: Optional[str]
    role: UserRole
    points: int
    total_recharged: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class OAuthLogin(BaseModel):
    provider: OAuthProvider
    code: str
    redirect_uri: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None  # UUID


class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ResourceBase(BaseModel):
    title: str
    description: str
    content: Optional[str] = None
    category_id: int
    file_type: Optional[str] = None
    file_size: Optional[str] = None
    is_free: bool = False
    points_required: int = 0
    tags: Optional[str] = None
    thumbnail_url: Optional[str] = None


class ResourceCreate(ResourceBase):
    is_pinned: bool = False
    is_featured: bool = False


class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None
    is_free: Optional[bool] = None
    points_required: Optional[int] = None
    status: Optional[ResourceStatus] = None
    is_featured: Optional[bool] = None
    tags: Optional[str] = None
    thumbnail_url: Optional[str] = None


class ResourceStatsUpdate(BaseModel):
    views: Optional[int] = None
    downloads: Optional[int] = None


class ResourceResponse(ResourceBase):
    id: str  # UUID
    slug: str
    author_id: str  # UUID
    file_url: Optional[str]
    views: int
    downloads: int
    status: ResourceStatus
    is_featured: bool
    is_pinned: bool
    thumbnail_url: Optional[str]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    pinned_at: Optional[datetime]
    category_name: Optional[str]
    category_slug: Optional[str]
    author_username: Optional[str]
    author_avatar: Optional[str] = None  # 作者头像
    tags_list: List[str] = Field(default_factory=list)
    is_purchased_by_user: bool = False
    like_count: int = 0
    comment_count: int = 0
    is_liked_by_user: bool = False
    attachments: List["ResourceAttachmentResponse"] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ResourceAttachmentResponse(BaseModel):
    id: int
    resource_id: str
    file_name: str
    file_url: str
    file_size: Optional[str]
    file_type: Optional[str]
    download_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class ResourceListResponse(BaseModel):
    id: str  # UUID
    title: str
    description: str
    category_id: int
    is_free: bool
    points_required: int
    views: int
    downloads: int
    status: ResourceStatus
    thumbnail_url: Optional[str]
    created_at: datetime
    published_at: Optional[datetime]
    tags: Optional[str]
    is_featured: bool
    is_pinned: bool
    pinned_at: Optional[datetime]
    category_name: Optional[str]
    category_slug: Optional[str]
    author_username: Optional[str]
    author_avatar: Optional[str] = None  # 作者头像
    tags_list: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class PointTransactionBase(BaseModel):
    type: TransactionType
    amount: int
    description: str
    reference_id: Optional[str] = None


class PointTransactionCreate(PointTransactionBase):
    pass


class PointTransactionResponse(PointTransactionBase):
    id: int
    user_id: Optional[str]  # UUID
    balance_after: int
    created_at: datetime

    class Config:
        from_attributes = True


class PointRecharge(BaseModel):
    amount: int = Field(..., gt=0, description="Amount to recharge (e.g., 500, 1200, 3000)")


class OperationLogCreate(BaseModel):
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    ip_address: str
    user_agent: str
    details: Optional[str] = None


class OperationLogResponse(OperationLogCreate):
    id: int
    user_id: Optional[str]  # UUID
    created_at: datetime

    class Config:
        from_attributes = True


class SystemConfigUpdate(BaseModel):
    value: str


class SystemConfigResponse(BaseModel):
    id: int
    key: str
    value: str
    description: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_users: int
    total_revenue: float
    total_articles: int
    user_growth: float
    revenue_growth: float


class VisitStatsResponse(BaseModel):
    total_visits: int
    unique_visitors: int
    avg_session_duration: int
    # visits_trend: List[dict]



class ResourceFeedItem(BaseModel):
    id: str
    title: str
    type: str
    size: str
    category: str
    isLocked: bool
    points: Optional[int] = None
    date: str
    tags: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    coverImage: Optional[str] = None


class ArticleAuthor(BaseModel):
    name: str
    avatar: Optional[str] = None


class ArticleFileAttachment(BaseModel):
    name: str
    size: Optional[str] = None
    type: Optional[str] = None


class ArticleDetail(BaseModel):
    id: str
    title: str
    summary: str
    content: str
    coverImage: Optional[str] = None
    author: ArticleAuthor
    publishDate: str
    isPaid: bool
    price: int
    tags: List[str] = Field(default_factory=list)
    fileAttachment: Optional[ArticleFileAttachment] = None


class PaymentQRCodeBase(BaseModel):
    payment_method: str
    qr_code_url: str
    description: Optional[str] = None


class PaymentQRCodeCreate(PaymentQRCodeBase):
    pass


class PaymentQRCodeUpdate(BaseModel):
    qr_code_url: Optional[str] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class PaymentQRCodeResponse(PaymentQRCodeBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class RechargePlanBase(BaseModel):
    name: str
    plan_type: str  # 'monthly', 'quarterly', 'yearly'
    points: int
    price: int  # 价格（分）
    description: Optional[str] = None
    features: Optional[str] = None  # JSON字符串
    wechat_qr_code: Optional[str] = None  # 微信收款码
    alipay_qr_code: Optional[str] = None  # 支付宝收款码


class RechargePlanCreate(RechargePlanBase):
    is_active: bool = True
    is_featured: bool = False
    order: int = 0


class RechargePlanUpdate(BaseModel):
    name: Optional[str] = None
    plan_type: Optional[str] = None
    points: Optional[int] = None
    price: Optional[int] = None
    description: Optional[str] = None
    features: Optional[str] = None
    wechat_qr_code: Optional[str] = None
    alipay_qr_code: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    order: Optional[int] = None


class RechargePlanResponse(RechargePlanBase):
    id: int
    is_active: bool
    is_featured: bool
    order: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class RechargeOrderCreate(BaseModel):
    plan_id: Optional[int] = None
    amount: int  # 支付金额（分）
    points: int  # 应获得的积分
    payment_method: str  # 'wechat' or 'alipay'
    payment_proof: Optional[str] = None  # 支付凭证URL


class RechargeOrderUpdate(BaseModel):
    status: Optional[RechargeOrderStatus] = None
    admin_note: Optional[str] = None


class RechargeOrderResponse(BaseModel):
    id: int
    order_no: str
    user_id: str  # UUID
    plan_id: Optional[int]
    amount: int
    points: int
    payment_method: str
    status: RechargeOrderStatus
    payment_proof: Optional[str]
    admin_note: Optional[str]
    approved_by: Optional[str]  # UUID
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Like Schemas
class LikeCreate(BaseModel):
    resource_id: str  # UUID


class LikeResponse(BaseModel):
    id: int
    user_id: str  # UUID
    resource_id: str  # UUID
    created_at: datetime
    username: Optional[str] = None

    class Config:
        from_attributes = True


# Comment Schemas
class CommentCreate(BaseModel):
    resource_id: str  # UUID
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class CommentResponse(BaseModel):
    id: int
    user_id: str  # UUID
    resource_id: str  # UUID
    content: str
    parent_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    replies: List['CommentResponse'] = Field(default_factory=list)

    class Config:
        from_attributes = True


CommentResponse.model_rebuild()
