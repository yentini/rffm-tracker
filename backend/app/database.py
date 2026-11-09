"""Database connection and session management supporting PostgreSQL and SQLite."""

import os
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


def _load_env_file() -> None:
    """Load key-value pairs from .env files into os.environ if not already present."""
    candidates = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path("/app/.env"),
    ]
    for env_path in candidates:
        if env_path.is_file():
            try:
                for line in env_path.read_text(encoding="utf-8").splitlines():
                    clean = line.strip()
                    if clean and not clean.startswith("#") and "=" in clean:
                        k, v = clean.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception:
                pass


_load_env_file()


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
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://"):
        try:
            import psycopg  # noqa: F401
        except ImportError:
            try:
                import psycopg2  # noqa: F401
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            except ImportError:
                pass
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


def init_db(max_retries: int = 5, retry_delay: float = 2.0) -> None:
    """Create database tables if they do not exist with retry logic."""
    import time
    import app.models  # noqa: F401

    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            return
        except Exception as exc:
            last_error = exc
            if attempt < max_retries:
                time.sleep(retry_delay)
    if last_error:
        print(f"Warning: Failed to initialize DB after {max_retries} attempts: {last_error}")


def get_db() -> Generator[Session, None, None]:
    """Provide a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

