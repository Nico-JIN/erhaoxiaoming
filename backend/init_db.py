"""Database initialization script."""

from datetime import datetime, timedelta

from sqlalchemy import inspect, text

from backend.app.core.security import get_password_hash
from backend.app.db.session import SessionLocal, engine, init_db
from backend.app.models import (
    Category,
    PointTransaction,
    Resource,
    ResourceStatus,
    SystemConfig,
    TransactionType,
    User,
    UserRole,
)
from backend.app.utils.text import create_slug


SAMPLE_FILE_URLS = [
    "https://file-examples.com/storage/fe9f0bf5399b1b5/2017/02/file-sample_100kB.doc",
    "https://file-examples.com/storage/fef8436d6f38719b/2017/10/file-sample_150kB.pdf",
    "https://file-examples.com/storage/fedc594c9f0f9b89/2017/02/file_example_XLS_10.xls",
    "https://file-examples.com/storage/fe0cb35c50a7611d/2017/10/file_example_JPG_1MB.jpg",
]


def ensure_schema_updates():
    """Apply lightweight schema adjustments when new columns are introduced."""

    inspector = inspect(engine)
    if "resources" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("resources")}
    statements = []

    if "is_pinned" not in existing_columns:
        statements.append(
            "ALTER TABLE resources ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured"
        )

    if "pinned_at" not in existing_columns:
        statements.append(
            "ALTER TABLE resources ADD COLUMN pinned_at DATETIME(6) NULL AFTER is_pinned"
        )

    if not statements:
        print("[OK] Resource table schema is already up to date")
        return

    with engine.begin() as connection:
        for stmt in statements:
            connection.execute(text(stmt))

    print("[OK] Resource table schema updated with new columns")


def ensure_admin(db):
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            full_name="System Administrator",
            role=UserRole.ADMIN,
            points=10000,
            is_active=True,
            is_verified=True,
        )
        db.add(admin_user)
        db.flush()
        print("[OK] Admin user created (username: admin, password: admin123)")
    return admin_user


def ensure_categories(db):
    categories = [
        {"name": "Engineering", "slug": "engineering", "icon": "Cpu", "order": 1, "description": "Software engineering resources"},
        {"name": "Design", "slug": "design", "icon": "PenTool", "order": 2, "description": "UI/UX design resources"},
        {"name": "Business", "slug": "business", "icon": "Briefcase", "order": 3, "description": "Business and strategy resources"},
        {"name": "Productivity", "slug": "productivity", "icon": "Zap", "order": 4, "description": "Productivity tools and templates"},
        {"name": "AI & Machine Learning", "slug": "ai", "icon": "Box", "order": 5, "description": "AI and ML resources"},
    ]

    for cat_data in categories:
        existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
        if not existing:
            db.add(Category(**cat_data))

    db.flush()
    print("[OK] Demo categories ensured")
    return {cat.slug: cat.id for cat in db.query(Category).all()}


def ensure_system_config(db):
    config_items = [
        {"key": "register_reward_points", "value": "300", "description": "Points awarded to new users upon registration"},
        {"key": "site_name", "value": "Erhaoxiaoming", "description": "Site name"},
        {"key": "site_description", "value": "Knowledge sharing and resource management platform", "description": "Site description"},
    ]

    for config_data in config_items:
        existing = db.query(SystemConfig).filter(SystemConfig.key == config_data["key"]).first()
        if not existing:
            db.add(SystemConfig(**config_data))

    print("[OK] System configuration ensured")


def ensure_demo_users(db):
    demo_users = [
        {
            "username": "alice",
            "email": "alice@example.com",
            "full_name": "Alice Johnson",
            "role": UserRole.USER,
            "is_verified": True,
            "recharges": [1500],
            "purchases": [
                {"amount": 150, "reference_id": "seed_purchase_alice_design", "description": "Downloaded premium design kit"}
            ],
        },
        {
            "username": "bob",
            "email": "bob@example.com",
            "full_name": "Bob Smith",
            "role": UserRole.USER,
            "is_verified": True,
            "recharges": [500],
            "purchases": [],
        },
        {
            "username": "charlie",
            "email": "charlie@example.com",
            "full_name": "Charlie Brown",
            "role": UserRole.VIP,
            "is_verified": True,
            "recharges": [3000],
            "purchases": [
                {"amount": 200, "reference_id": "seed_purchase_charlie_finance", "description": "Downloaded finance model"},
                {"amount": 80, "reference_id": "seed_purchase_charlie_rust", "description": "Unlocked Rust guide"},
            ],
        },
    ]

    created_users = []
    for user_data in demo_users:
        user = db.query(User).filter(User.username == user_data["username"]).first()
        if not user:
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                hashed_password=get_password_hash("user123"),
                full_name=user_data["full_name"],
                role=user_data["role"],
                points=0,
                total_recharged=0,
                is_active=True,
                is_verified=user_data.get("is_verified", False),
            )
            db.add(user)
            db.flush()
            print(f"[OK] Demo user created (username: {user.username}, password: user123)")

        # Seed recharge transactions
        for idx, amount in enumerate(user_data.get("recharges", []), start=1):
            reference_id = f"seed_recharge_{user.username}_{idx}"
            existing_tx = (
                db.query(PointTransaction)
                .filter(PointTransaction.reference_id == reference_id)
                .first()
            )
            if existing_tx:
                continue
            user.points += amount
            user.total_recharged += amount
            transaction = PointTransaction(
                user_id=user.id,
                type=TransactionType.RECHARGE,
                amount=amount,
                balance_after=user.points,
                description=f"Seed recharge +{amount} points",
                reference_id=reference_id,
            )
            db.add(transaction)

        # Seed purchase transactions
        for purchase in user_data.get("purchases", []):
            reference_id = purchase["reference_id"]
            existing_tx = (
                db.query(PointTransaction)
                .filter(PointTransaction.reference_id == reference_id)
                .first()
            )
            if existing_tx:
                continue
            cost = purchase["amount"]
            if user.points < cost:
                # top up silently to keep balance non-negative
                user.points += cost
            user.points -= cost
            transaction = PointTransaction(
                user_id=user.id,
                type=TransactionType.PURCHASE,
                amount=-cost,
                balance_after=user.points,
                description=purchase["description"],
                reference_id=reference_id,
            )
            db.add(transaction)

        created_users.append(user)

    print("[OK] Demo users ensured with point history")
    return created_users


def ensure_resources(db, admin_user, category_map):
    seed_resources = [
        {
            "title": "High-Scale Architecture",
            "description": "Blueprints for building reliable, planet-scale distributed systems.",
            "category_slug": "engineering",
            "is_free": False,
            "points_required": 100,
            "thumbnail_url": "https://picsum.photos/id/42/600/400",
            "tags": ["Architecture", "Scaling"],
            "downloads": 420,
            "views": 1280,
            "is_featured": True,
            "age_days": 7,
        },
        {
            "title": "Personal Knowledge Management OS",
            "description": "A full template to run your second brain using Obsidian and Notion.",
            "category_slug": "productivity",
            "is_free": True,
            "points_required": 0,
            "thumbnail_url": "https://picsum.photos/id/20/600/400",
            "tags": ["PKM", "Workflow"],
            "downloads": 310,
            "views": 980,
            "is_featured": True,
            "age_days": 3,
        },
        {
            "title": "Building LLM-Powered Apps",
            "description": "Practical patterns for launching GenAI products with guardrails.",
            "category_slug": "ai",
            "is_free": False,
            "points_required": 50,
            "thumbnail_url": "https://picsum.photos/id/3/600/400",
            "tags": ["LLM", "Product"],
            "downloads": 640,
            "views": 1620,
            "is_featured": True,
            "age_days": 10,
        },
        {
            "title": "The Art of UI Design Systems",
            "description": "Design tokens, components, and review workflows used by top teams.",
            "category_slug": "design",
            "is_free": False,
            "points_required": 150,
            "thumbnail_url": "https://picsum.photos/id/180/600/400",
            "tags": ["Design Systems", "Process"],
            "downloads": 210,
            "views": 740,
            "is_featured": True,
            "age_days": 15,
        },
        {
            "title": "Rust for Web Developers",
            "description": "Cutting-edge guide for teams moving performance-critical paths to Rust.",
            "category_slug": "engineering",
            "is_free": False,
            "points_required": 80,
            "thumbnail_url": "https://picsum.photos/id/1/600/400",
            "tags": ["Rust", "Backend"],
            "downloads": 180,
            "views": 600,
            "is_featured": True,
            "age_days": 5,
        },
        {
            "title": "Growth Hacking Playbook",
            "description": "Battle-tested experiments to grow SaaS revenue from 0 to 1M ARR.",
            "category_slug": "business",
            "is_free": True,
            "points_required": 0,
            "thumbnail_url": "https://picsum.photos/id/6/600/400",
            "tags": ["Growth", "SaaS"],
            "downloads": 520,
            "views": 1100,
            "is_featured": True,
            "age_days": 20,
        },
        {
            "title": "System Architecture Patterns",
            "description": "A 60-page reference covering microservices, data mesh, and CQRS.",
            "category_slug": "engineering",
            "is_free": False,
            "points_required": 150,
            "thumbnail_url": "https://picsum.photos/id/42/601/401",
            "tags": ["Backend", "Architecture"],
            "downloads": 350,
            "views": 950,
            "is_featured": False,
            "age_days": 30,
        },
        {
            "title": "React Performance Optimization Guide",
            "description": "Toolkit to keep complex React apps running at 60fps.",
            "category_slug": "engineering",
            "is_free": True,
            "points_required": 0,
            "thumbnail_url": "https://picsum.photos/id/21/600/400",
            "tags": ["Frontend", "Performance"],
            "downloads": 480,
            "views": 1020,
            "is_featured": False,
            "age_days": 12,
        },
        {
            "title": "Startup Financial Models 2024",
            "description": "Plug-and-play financial models for SaaS, Marketplace, and eCommerce.",
            "category_slug": "business",
            "is_free": False,
            "points_required": 200,
            "thumbnail_url": "https://picsum.photos/id/25/600/400",
            "tags": ["Finance", "Excel"],
            "downloads": 260,
            "views": 800,
            "is_featured": False,
            "age_days": 18,
        },
        {
            "title": "Obsidian Second Brain Template",
            "description": "A structured vault template to jumpstart personal knowledge management.",
            "category_slug": "productivity",
            "is_free": True,
            "points_required": 0,
            "thumbnail_url": "https://picsum.photos/id/50/600/400",
            "tags": ["PKM", "Template"],
            "downloads": 610,
            "views": 1340,
            "is_featured": False,
            "age_days": 25,
        },
        {
            "title": "Transformer Attention Mechanisms",
            "description": "Deep dive research paper on self-attention best practices.",
            "category_slug": "ai",
            "is_free": True,
            "points_required": 0,
            "thumbnail_url": "https://picsum.photos/id/33/600/400",
            "tags": ["LLM", "Research"],
            "downloads": 700,
            "views": 1500,
            "is_featured": False,
            "age_days": 8,
        },
    ]

    for index, data in enumerate(seed_resources):
        slug = create_slug(data["title"])
        existing = db.query(Resource).filter(Resource.slug == slug).first()
        if existing:
            continue

        category_id = category_map.get(data["category_slug"])
        if not category_id:
            continue

        file_url = SAMPLE_FILE_URLS[index % len(SAMPLE_FILE_URLS)]
        file_type = file_url.split(".")[-1].upper()
        published_at = datetime.utcnow() - timedelta(days=data.get("age_days", 0))

        resource = Resource(
            title=data["title"],
            description=data["description"],
            content=f"## {data['title']}\n\n{data['description']}\n\n- Built for professionals\n- Includes editable assets\n- Updated {published_at.date()}",
            category_id=category_id,
            slug=slug,
            author_id=admin_user.id,
            is_free=data["is_free"],
            points_required=data["points_required"],
            tags=",".join(data.get("tags", [])),
            thumbnail_url=data["thumbnail_url"],
            file_url=file_url,
            file_type=file_type,
            file_size="~50MB",
            views=data["views"],
            downloads=data["downloads"],
            status=ResourceStatus.PUBLISHED,
            is_featured=data.get("is_featured", False),
            published_at=published_at,
        )
        db.add(resource)

    print("[OK] Demo resources ensured")


def seed_data():
    """Seed initial data"""

    db = SessionLocal()
    try:
        admin_user = ensure_admin(db)
        category_map = ensure_categories(db)
        ensure_system_config(db)
        ensure_demo_users(db)
        ensure_resources(db, admin_user, category_map)

        db.commit()
        print("\n[OK] Database seeding completed successfully!")
    except Exception as exc:
        print(f"\n[ERROR] Error seeding database: {exc}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("\nApplying schema updates...")
    ensure_schema_updates()
    print("\nSeeding initial data...")
    seed_data()
    print("\n" + "="*50)
    print("Database setup completed!")
    print("="*50)
    print("\nYou can now start the server with:")
    print("  python -m uvicorn backend.main:app --reload")
    print("\nAdmin credentials:")
    print("  Username: admin")
    print("  Password: admin123")
    print("\nAPI Documentation:")
    print("  http://localhost:8000/docs")
