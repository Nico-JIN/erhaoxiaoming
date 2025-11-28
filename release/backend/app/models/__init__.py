"""SQLAlchemy models."""

import enum
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.mysql import CHAR


Base = declarative_base()


def generate_uuid():
    """Generate a 32-character UUID without hyphens."""
    return uuid.uuid4().hex


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    VIP = "VIP"


class OAuthProvider(str, enum.Enum):
    GOOGLE = "google"
    GITHUB = "github"
    QQ = "qq"
    WECHAT = "wechat"
    PHONE = "phone"


class ResourceStatus(str, enum.Enum):
    DRAFT = "Draft"
    PUBLISHED = "Published"
    ARCHIVED = "Archived"


class TransactionType(str, enum.Enum):
    REGISTER = "REGISTER"
    RECHARGE = "RECHARGE"
    PURCHASE = "PURCHASE"
    REFUND = "REFUND"
    ADMIN_ADJUST = "ADMIN_ADJUST"


class User(Base):
    __tablename__ = "users"

    id = Column(CHAR(32), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(200))
    avatar_url = Column(String(500))

    role = Column(Enum(UserRole), default=UserRole.USER)
    points = Column(Integer, default=0)
    total_recharged = Column(Integer, default=0)

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))

    oauth_accounts = relationship(
        "OAuthAccount", back_populates="user", cascade="all, delete-orphan"
    )
    resources = relationship("Resource", back_populates="author")
    point_transactions = relationship("PointTransaction", back_populates="user")
    operation_logs = relationship("OperationLog", back_populates="user")


class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(CHAR(32), ForeignKey("users.id", ondelete="CASCADE"))
    provider = Column(Enum(OAuthProvider))
    provider_user_id = Column(String(255))
    access_token = Column(String(500))
    refresh_token = Column(String(500), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="oauth_accounts")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    slug = Column(String(100), unique=True, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    order = Column(Integer, default=0)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    resources = relationship("Resource", back_populates="category")


class Resource(Base):
    __tablename__ = "resources"

    id = Column(CHAR(32), primary_key=True, default=generate_uuid, index=True)
    title = Column(String(255), index=True)
    slug = Column(String(255), unique=True, index=True)
    description = Column(Text)
    content = Column(Text, nullable=True)

    category_id = Column(Integer, ForeignKey("categories.id"))
    author_id = Column(CHAR(32), ForeignKey("users.id"))

    file_url = Column(String(500), nullable=True)
    file_type = Column(String(50), nullable=True)
    file_size = Column(String(20), nullable=True)

    is_free = Column(Boolean, default=False)
    points_required = Column(Integer, default=0)

    views = Column(Integer, default=0)
    downloads = Column(Integer, default=0)

    status = Column(Enum(ResourceStatus), default=ResourceStatus.DRAFT)
    is_featured = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    pinned_at = Column(DateTime(timezone=True), nullable=True)

    tags = Column(String(500), nullable=True)

    thumbnail_url = Column(String(500), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("Category", back_populates="resources")
    author = relationship("User", back_populates="resources")
    likes = relationship("ResourceLike", back_populates="resource", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="resource", cascade="all, delete-orphan")

    @property
    def category_name(self):
        return self.category.name if self.category else None

    @property
    def category_slug(self):
        return self.category.slug if self.category else None

    @property
    def author_username(self):
        return self.author.username if self.author else None

    @property
    def author_avatar(self):
        """返回作者头像URL"""
        return self.author.avatar_url if self.author else None

    @property
    def tags_list(self):
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(",") if tag.strip()]

    @property
    def tag_list(self):  # backward compatibility
        return self.tags_list


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(CHAR(32), ForeignKey("users.id"))

    type = Column(Enum(TransactionType))
    amount = Column(Integer)
    balance_after = Column(Integer)

    description = Column(String(500))
    reference_id = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="point_transactions")


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(CHAR(32), ForeignKey("users.id"), nullable=True)

    action = Column(String(100))
    resource_type = Column(String(50))
    resource_id = Column(String(50), nullable=True)

    ip_address = Column(String(50))
    user_agent = Column(String(500))

    details = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="operation_logs")


class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True)
    value = Column(Text)
    description = Column(String(500), nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PaymentQRCode(Base):
    __tablename__ = "payment_qrcodes"

    id = Column(Integer, primary_key=True, index=True)
    payment_method = Column(String(50))  # 'wechat' or 'alipay'
    qr_code_url = Column(String(500))  # URL to uploaded QR code image
    is_active = Column(Boolean, default=True)
    description = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RechargePlan(Base):
    __tablename__ = "recharge_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))  # 例如 "月度会员"、"季度会员"、"年度会员"
    plan_type = Column(String(50))  # 'monthly', 'quarterly', 'yearly'
    points = Column(Integer)  # 获得的积分
    price = Column(Integer)  # 价格（分）
    description = Column(Text, nullable=True)  # 描述
    features = Column(Text, nullable=True)  # JSON格式的功能列表
    
    # 收款码URL
    wechat_qr_code = Column(String(500), nullable=True)  # 微信收款码
    alipay_qr_code = Column(String(500), nullable=True)  # 支付宝收款码
    
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)  # 是否是推荐套餐
    order = Column(Integer, default=0)  # 显示顺序
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RechargeOrderStatus(str, enum.Enum):
    PENDING = "PENDING"  # 待审核
    APPROVED = "APPROVED"  # 已批准
    REJECTED = "REJECTED"  # 已拒绝
    COMPLETED = "COMPLETED"  # 已完成


class RechargeOrder(Base):
    __tablename__ = "recharge_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(100), unique=True, index=True)  # 订单号
    user_id = Column(CHAR(32), ForeignKey("users.id"))
    plan_id = Column(Integer, ForeignKey("recharge_plans.id"), nullable=True)
    
    amount = Column(Integer)  # 支付金额（分）
    points = Column(Integer)  # 应获得的积分
    payment_method = Column(String(50))  # 'wechat' or 'alipay'
    
    status = Column(Enum(RechargeOrderStatus), default=RechargeOrderStatus.PENDING)
    payment_proof = Column(String(500), nullable=True)  # 支付凭证图片URL
    admin_note = Column(Text, nullable=True)  # 管理员备注
    
    approved_by = Column(CHAR(32), ForeignKey("users.id"), nullable=True)  # 审核管理员
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])


class ResourceLike(Base):
    __tablename__ = "resource_likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(CHAR(32), ForeignKey("users.id", ondelete="CASCADE"))
    resource_id = Column(CHAR(32), ForeignKey("resources.id", ondelete="CASCADE"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    resource = relationship("Resource", back_populates="likes")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(CHAR(32), ForeignKey("users.id", ondelete="CASCADE"))
    resource_id = Column(CHAR(32), ForeignKey("resources.id", ondelete="CASCADE"))
    content = Column(Text)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)  # 用于回复功能
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
    resource = relationship("Resource", back_populates="comments")
    replies = relationship("Comment", backref="parent", remote_side=[id])
