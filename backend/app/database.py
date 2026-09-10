from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from sqlalchemy import Boolean, DateTime, Integer, JSON, String, Text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config import settings

logger = logging.getLogger("uvicorn.error")


class Base(DeclarativeBase):
    pass


class EnquiryModel(Base):
    """Persisted record of an inbound contact enquiry."""

    __tablename__ = "enquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reference: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    service: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    delivered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    delivery_channels: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


engine: Optional[AsyncEngine] = None
async_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def normalize_db_url(raw_url: str) -> str:
    """Ensure asyncpg driver is specified for postgres URLs."""
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if raw_url.startswith("postgresql://") and "+asyncpg" not in raw_url:
        return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw_url


async def init_db() -> bool:
    """Initialize connection pool and bootstrap database tables if DATABASE_URL is configured."""
    global engine, async_session_factory

    if not settings.DATABASE_URL:
        logger.info("DATABASE_URL not set — database engine skipped.")
        return False

    try:
        db_url = normalize_db_url(settings.DATABASE_URL)
        # Managed DB pooling parameters
        connect_args = {}
        if "sslmode=require" in db_url or "ssl=require" in db_url:
            connect_args["ssl"] = True

        engine = create_async_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            pool_timeout=15,
            pool_recycle=1800,
            connect_args=connect_args,
            echo=False,
        )
        async_session_factory = async_sessionmaker(
            engine, expire_on_commit=False, class_=AsyncSession
        )

        # In production, schema is managed strictly via Alembic migrations.
        # Startup will never blindly run create_all against a production database.
        if settings.ENVIRONMENT != "production":
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Relational database initialized (development schema check complete).")
        else:
            logger.info("Production database connected; schema management handled via Alembic.")

        return True
    except Exception as exc:
        logger.error("Failed to initialize database connection: %s", exc)
        return False


async def close_db() -> None:
    """Dispose of the database engine on shutdown."""
    global engine
    if engine is not None:
        await engine.dispose()
        logger.info("Database engine disposed.")
