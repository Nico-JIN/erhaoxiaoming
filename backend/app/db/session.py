"""Database engine and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.core.config import get_settings
from backend.app.models import Base


settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Yield a database session per request."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create database tables if they do not exist."""

    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
    
    # 初始化默认充值套餐
    _init_default_recharge_plans()


def _init_default_recharge_plans():
    """初始化默认的充值套餐数据。"""
    from backend.app.models import RechargePlan
    
    db = SessionLocal()
    try:
        # 检查是否已经有套餐数据
        existing_count = db.query(RechargePlan).count()
        if existing_count > 0:
            print(f"充值套餐已存在 ({existing_count} 个)，跳过初始化")
            return
        
        # 月度会员
        monthly_plan = RechargePlan(
            name="月度会员",
            plan_type="monthly",
            points=500,
            price=990,  # 9.90元 = 990分
            description="适合探索特定主题的休闲读者。",
            features='["访问标准付费文章", "立即到账 500 积分", "无广告阅读体验"]',
            is_active=True,
            is_featured=False,
            order=1,
        )
        
        # 年度专业版（推荐）
        yearly_plan = RechargePlan(
            name="年度专业版",
            plan_type="yearly",
            points=3000,
            price=8900,  # 89.00元 = 8900分
            description="适合追求无限潜力的深度学习者。",
            features='["立即到账 3000 积分", "访问所有高级资源", "优先下载速度", "认证徽章"]',
            is_active=True,
            is_featured=True,  # 推荐套餐
            order=2,
        )
        
        # 季度会员
        quarterly_plan = RechargePlan(
            name="季度会员",
            plan_type="quarterly",
            points=1200,
            price=2500,  # 25.00元 = 2500分
            description="平衡的季度学习计划。",
            features='["到账 1200 积分", "访问付费视频内容", "社区评论权限"]',
            is_active=True,
            is_featured=False,
            order=3,
        )
        
        # 添加到数据库
        db.add(monthly_plan)
        db.add(yearly_plan)
        db.add(quarterly_plan)
        db.commit()
        
        print("✓ 成功初始化 3 个充值套餐:")
        print(f"  - 月度会员: {monthly_plan.points} 积分, ￥{monthly_plan.price/100:.2f}")
        print(f"  - 年度专业版: {yearly_plan.points} 积分, ￥{yearly_plan.price/100:.2f} (推荐)")
        print(f"  - 季度会员: {quarterly_plan.points} 积分, ￥{quarterly_plan.price/100:.2f}")
        
    except Exception as e:
        db.rollback()
        print(f"✗ 初始化充值套餐失败: {e}")
    finally:
        db.close()
