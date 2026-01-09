"""FastAPI application factory."""

from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.routers import register_routers
from backend.app.core.config import get_settings
from backend.app.db.session import SessionLocal, init_db
from backend.app.models import Resource, User
from backend.app.middleware import RateLimitMiddleware, IPBlocklistMiddleware
from backend.init_db import seed_data


settings = get_settings()

app = FastAPI(
    title="Erhaoxiaoming API",
    description="Knowledge sharing and resource management platform",
    version="1.0.0",
)

# CORS配置 - 允许前端域名访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # 本地开发
        "http://localhost:5174",
        "http://localhost:5005",      # Vite 备用端口
        "http://localhost:5006",      # Vite 备用端口
        "http://localhost:5007",      # Vite 备用端口
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5005",
        "http://127.0.0.1:5006",
        "http://127.0.0.1:5007",
        "https://ai.dxin.store",      # 生产环境前端
        "https://api.dxin.store",     # 生产环境 API
    ],
    allow_credentials=True,  # 允许携带认证信息
    allow_methods=["*"],  # 允许所有HTTP方法
    allow_headers=["*"],  # 允许所有请求头
    expose_headers=["*"],  # 暴露所有响应头
)

# Add anti-bot middlewares
# DISABLED: Rate limiting middleware was causing 429 errors for legitimate users
# app.add_middleware(RateLimitMiddleware, requests_per_minute=100, requests_per_second=10)
# app.add_middleware(IPBlocklistMiddleware)

# Add analytics tracking
# Disabled: Using PageTracker component in frontend instead to avoid duplicate tracking
# from backend.app.middleware import AnalyticsMiddleware
# app.add_middleware(AnalyticsMiddleware)

register_routers(app)


def seed_if_needed() -> None:
    """Seed database with demo data when empty."""

    db = SessionLocal()
    try:
        has_users = db.query(User).first() is not None
        has_resources = db.query(Resource).first() is not None
    finally:
        db.close()

    if not (has_users and has_resources):
        seed_data()


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize database and services on startup."""

    try:
        init_db()
        seed_if_needed()
        print("✓ Database initialized successfully")
    except Exception as exc:  # pragma: no cover
        print(f"✗ Error initializing: {exc}")




@app.get("/")
async def root():
    return {
        "message": "Welcome to Erhaoxiaoming API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/server-time")
async def get_server_time():
    """返回服务器当前时间，用于前端时间同步"""
    now = datetime.now(timezone.utc)
    return {
        "server_time": now.isoformat(),
        "timestamp": int(now.timestamp() * 1000),  # Unix timestamp in milliseconds
        "timezone": "UTC"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
