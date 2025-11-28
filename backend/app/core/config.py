"""Application settings module."""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse, urlunparse

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Centralized application configuration."""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/erhaoxiaoming"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth Providers
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = ""
    QQ_APP_ID: str = ""
    QQ_APP_KEY: str = ""
    QQ_REDIRECT_URI: str = ""
    WECHAT_APP_ID: str = ""
    WECHAT_APP_SECRET: str = ""
    WECHAT_REDIRECT_URI: str = ""

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "resources"
    MINIO_SECURE: bool = False

    # System Config
    REGISTER_REWARD_POINTS: int = 300

    # CORS
    CORS_ORIGINS: List[str] = ["*"]  # 允许所有来源
    CORS_ALLOW_ORIGIN_REGEX: Optional[str] = None

    def cors_allowed_origins(self) -> List[str]:
        """Return configured CORS origins plus localhost/127.0.0.1 variants."""

        resolved: List[str] = []
        seen = set()

        def add(origin: str) -> None:
            normalized = origin.rstrip("/")
            if normalized and normalized not in seen:
                resolved.append(normalized)
                seen.add(normalized)

        for origin in self.CORS_ORIGINS:
            if not origin:
                continue
            add(origin)

            parsed = urlparse(origin)
            host = parsed.hostname or ""
            if host not in {"localhost", "127.0.0.1"}:
                continue

            alt_host = "127.0.0.1" if host == "localhost" else "localhost"
            port = f":{parsed.port}" if parsed.port else ""
            scheme = parsed.scheme or "http"
            alternate = urlunparse((scheme, f"{alt_host}{port}", "", "", "", ""))
            add(alternate)

        add("null")

        return resolved

    def cors_allow_origin_regex(self) -> Optional[str]:
        """Return regex for CORS origins if configured."""

        value = self.CORS_ALLOW_ORIGIN_REGEX
        if value:
            return value
        return None


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()
