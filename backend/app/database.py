"""Database connection and session management supporting PostgreSQL and SQLite."""

import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


def resolve_database_url(raw_url: str | None = None) -> str:
    """Normalize the database URL, defaulting to local SQLite when not set.

    Args:
        raw_url: Optional raw database URL string.

    Returns:
        Normalized SQLAlchemy connection URL.
    """
    url = (raw_url if raw_url is not None else os.getenv("DATABASE_URL", "")).strip()
    if not url:
        return "sqlite:///./rffm.db"
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


DATABASE_URL = resolve_database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=not IS_SQLITE,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""


def init_db() -> None:
    """Create database tables if they do not exist."""
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Provide a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

