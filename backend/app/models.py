"""SQLAlchemy ORM models for Users, Favorite Teams, and Favorite Campos."""

from datetime import datetime, timezone
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserModel(Base):
    """Registered user account (local email/password or Google OAuth)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(32), default="local", nullable=False)
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    favorite_teams: Mapped[list["FavoriteTeamModel"]] = relationship(
        "FavoriteTeamModel",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="FavoriteTeamModel.position",
    )
    favorite_campos: Mapped[list["FavoriteCampoModel"]] = relationship(
        "FavoriteCampoModel",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="FavoriteCampoModel.position",
    )


class FavoriteTeamModel(Base):
    """Persisted favorite team associated with a user account."""

    __tablename__ = "favorite_teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    team_id: Mapped[str] = mapped_column(String(64), nullable=False)
    team_name: Mapped[str] = mapped_column(String(255), nullable=False)
    team_shield: Mapped[str | None] = mapped_column(String(512), nullable=True)
    season_id: Mapped[str] = mapped_column(String(32), nullable=False)
    season_name: Mapped[str] = mapped_column(String(64), nullable=False)
    game_type_id: Mapped[str] = mapped_column(String(32), nullable=False)
    game_type_name: Mapped[str] = mapped_column(String(128), nullable=False)
    competition_id: Mapped[str] = mapped_column(String(64), nullable=False)
    competition_name: Mapped[str] = mapped_column(String(255), nullable=False)
    group_id: Mapped[str] = mapped_column(String(64), nullable=False)
    group_name: Mapped[str] = mapped_column(String(255), nullable=False)
    saved_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["UserModel"] = relationship("UserModel", back_populates="favorite_teams")


class FavoriteCampoModel(Base):
    """Persisted favorite venue/campo associated with a user account."""

    __tablename__ = "favorite_campos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    codigo_campo: Mapped[str] = mapped_column(String(64), nullable=False)
    nombre_campo: Mapped[str] = mapped_column(String(255), nullable=False)
    localidad: Mapped[str | None] = mapped_column(String(255), nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    club_asociado: Mapped[str | None] = mapped_column(String(255), nullable=True)
    superficie: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tipo_campo: Mapped[str | None] = mapped_column(String(128), nullable=True)
    saved_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["UserModel"] = relationship("UserModel", back_populates="favorite_campos")

