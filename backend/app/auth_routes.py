"""FastAPI router for user authentication and cloud-synced favorites."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_google_id_token,
    verify_password,
)
from app.database import get_db
from app.models import FavoriteCampoModel, FavoriteTeamModel, UserModel

router = APIRouter()


class RegisterRequest(BaseModel):
    """Payload for quick email registration."""

    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=4, max_length=128)
    name: Optional[str] = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    """Payload for email/password login."""

    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class GoogleAuthRequest(BaseModel):
    """Payload for Google OAuth sign-in."""

    credential: str = Field(..., min_length=10)


class UserPublic(BaseModel):
    """Public representation of an authenticated user."""

    id: int
    email: str
    name: Optional[str] = None
    auth_provider: str


class AuthResponse(BaseModel):
    """JWT authentication response."""

    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class FavoriteTeamPayload(BaseModel):
    """Favorite team item matching frontend FavoriteTeam interface."""

    teamId: str
    teamName: str
    teamShield: Optional[str] = None
    seasonId: str
    seasonName: str
    gameTypeId: str
    gameTypeName: str
    competitionId: str
    competitionName: str
    groupId: str
    groupName: str
    savedAt: int


class FavoriteCampoPayload(BaseModel):
    """Favorite venue item matching frontend FavoriteCampo interface."""

    codigoCampo: str
    nombreCampo: str
    localidad: Optional[str] = None
    direccion: Optional[str] = None
    clubAsociado: Optional[str] = None
    superficie: Optional[str] = None
    tipoCampo: Optional[str] = None
    savedAt: int


class UserFavoritesResponse(BaseModel):
    """Combined favorites payload for a user."""

    teams: List[FavoriteTeamPayload]
    campos: List[FavoriteCampoPayload]


class UpdateFavoriteTeamsRequest(BaseModel):
    """Payload to replace ordered favorite teams."""

    teams: List[FavoriteTeamPayload]


class UpdateFavoriteCamposRequest(BaseModel):
    """Payload to replace ordered favorite campos."""

    campos: List[FavoriteCampoPayload]


def _normalize_email(raw_email: str) -> str:
    """Validate and normalize an email string."""
    email = raw_email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Introduce una dirección de correo electrónico válida.",
        )
    return email


def _build_auth_response(user: UserModel) -> AuthResponse:
    """Build a signed JWT AuthResponse from a UserModel."""
    token = create_access_token(user.id, user.email, user.name)
    return AuthResponse(
        access_token=token,
        user=UserPublic(
            id=user.id,
            email=user.email,
            name=user.name,
            auth_provider=user.auth_provider,
        ),
    )


def _serialize_favorites(user: UserModel) -> UserFavoritesResponse:
    """Convert ORM favorite relations into UserFavoritesResponse."""
    teams = [
        FavoriteTeamPayload(
            teamId=t.team_id,
            teamName=t.team_name,
            teamShield=t.team_shield,
            seasonId=t.season_id,
            seasonName=t.season_name,
            gameTypeId=t.game_type_id,
            gameTypeName=t.game_type_name,
            competitionId=t.competition_id,
            competitionName=t.competition_name,
            groupId=t.group_id,
            groupName=t.group_name,
            savedAt=t.saved_at,
        )
        for t in sorted(user.favorite_teams, key=lambda x: x.position)
    ]
    campos = [
        FavoriteCampoPayload(
            codigoCampo=c.codigo_campo,
            nombreCampo=c.nombre_campo,
            localidad=c.localidad,
            direccion=c.direccion,
            clubAsociado=c.club_asociado,
            superficie=c.superficie,
            tipoCampo=c.tipo_campo,
            savedAt=c.saved_at,
        )
        for c in sorted(user.favorite_campos, key=lambda x: x.position)
    ]
    return UserFavoritesResponse(teams=teams, campos=campos)


def _replace_user_teams(db: Session, user: UserModel, teams: List[FavoriteTeamPayload]) -> None:
    """Replace the user's favorite teams preserving order and deduplicating keys."""
    db.query(FavoriteTeamModel).filter(FavoriteTeamModel.user_id == user.id).delete()
    seen: set[str] = set()
    pos = 0
    for item in teams:
        key = f"{item.teamId}_{item.competitionId}_{item.groupId}"
        if key in seen:
            continue
        seen.add(key)
        db.add(
            FavoriteTeamModel(
                user_id=user.id,
                position=pos,
                team_id=item.teamId,
                team_name=item.teamName,
                team_shield=item.teamShield,
                season_id=item.seasonId,
                season_name=item.seasonName,
                game_type_id=item.gameTypeId,
                game_type_name=item.gameTypeName,
                competition_id=item.competitionId,
                competition_name=item.competitionName,
                group_id=item.groupId,
                group_name=item.groupName,
                saved_at=item.savedAt,
            )
        )
        pos += 1
    db.commit()
    db.refresh(user)


def _replace_user_campos(
    db: Session, user: UserModel, campos: List[FavoriteCampoPayload]
) -> None:
    """Replace the user's favorite campos preserving order and deduplicating keys."""
    db.query(FavoriteCampoModel).filter(FavoriteCampoModel.user_id == user.id).delete()
    seen: set[str] = set()
    pos = 0
    for item in campos:
        if item.codigoCampo in seen:
            continue
        seen.add(item.codigoCampo)
        db.add(
            FavoriteCampoModel(
                user_id=user.id,
                position=pos,
                codigo_campo=item.codigoCampo,
                nombre_campo=item.nombreCampo,
                localidad=item.localidad,
                direccion=item.direccion,
                club_asociado=item.clubAsociado,
                superficie=item.superficie,
                tipo_campo=item.tipoCampo,
                saved_at=item.savedAt,
            )
        )
        pos += 1
    db.commit()
    db.refresh(user)


@router.post(
    "/api/auth/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Autenticación"],
    summary="Alta rápida de usuario con email y contraseña",
)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Register a new user account with email and password."""
    email = _normalize_email(payload.email)
    existing = db.query(UserModel).filter(UserModel.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta registrada con este correo electrónico.",
        )
    display_name = (payload.name or "").strip() or email.split("@")[0]
    user = UserModel(
        email=email,
        name=display_name,
        password_hash=hash_password(payload.password),
        auth_provider="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_auth_response(user)


@router.post(
    "/api/auth/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    tags=["Autenticación"],
    summary="Iniciar sesión con email y contraseña",
)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Authenticate an existing user with email and password."""
    email = _normalize_email(payload.email)
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos.",
        )
    return _build_auth_response(user)


@router.post(
    "/api/auth/google",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    tags=["Autenticación"],
    summary="Iniciar sesión o registrarse con Google OAuth",
)
async def google_login(
    payload: GoogleAuthRequest, db: Session = Depends(get_db)
) -> AuthResponse:
    """Authenticate or auto-register a user from a verified Google ID token."""
    google_info = await verify_google_id_token(payload.credential)
    email = google_info["email"]
    sub = google_info["sub"]

    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        user = UserModel(
            email=email,
            name=google_info["name"],
            auth_provider="google",
            google_sub=sub,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.google_sub and sub:
        user.google_sub = sub
        db.commit()
        db.refresh(user)

    return _build_auth_response(user)


@router.get(
    "/api/auth/me",
    response_model=UserPublic,
    status_code=status.HTTP_200_OK,
    tags=["Autenticación"],
    summary="Obtener perfil del usuario autenticado",
)
def get_me(current_user: UserModel = Depends(get_current_user)) -> UserPublic:
    """Return the authenticated user's profile."""
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        auth_provider=current_user.auth_provider,
    )


@router.get(
    "/api/favorites",
    response_model=UserFavoritesResponse,
    status_code=status.HTTP_200_OK,
    tags=["Favoritos"],
    summary="Obtener equipos y sedes favoritas del usuario",
)
def get_user_favorites(
    current_user: UserModel = Depends(get_current_user),
) -> UserFavoritesResponse:
    """Retrieve the authenticated user's ordered favorite teams and campos."""
    return _serialize_favorites(current_user)


@router.put(
    "/api/favorites/teams",
    response_model=UserFavoritesResponse,
    status_code=status.HTTP_200_OK,
    tags=["Favoritos"],
    summary="Actualizar lista ordenada de equipos favoritos del usuario",
)
def update_favorite_teams(
    payload: UpdateFavoriteTeamsRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserFavoritesResponse:
    """Replace the user's ordered list of favorite teams."""
    _replace_user_teams(db, current_user, payload.teams)
    return _serialize_favorites(current_user)


@router.put(
    "/api/favorites/campos",
    response_model=UserFavoritesResponse,
    status_code=status.HTTP_200_OK,
    tags=["Favoritos"],
    summary="Actualizar lista ordenada de sedes favoritas del usuario",
)
def update_favorite_campos(
    payload: UpdateFavoriteCamposRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserFavoritesResponse:
    """Replace the user's ordered list of favorite campos."""
    _replace_user_campos(db, current_user, payload.campos)
    return _serialize_favorites(current_user)


@router.post(
    "/api/favorites/sync",
    response_model=UserFavoritesResponse,
    status_code=status.HTTP_200_OK,
    tags=["Favoritos"],
    summary="Sincronizar y fusionar favoritos locales de invitado con la cuenta",
)
def sync_favorites(
    payload: UserFavoritesResponse,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserFavoritesResponse:
    """Merge guest local favorites into the user's cloud account without duplicates."""
    existing = _serialize_favorites(current_user)
    merged_teams = existing.teams + payload.teams
    merged_campos = existing.campos + payload.campos
    if payload.teams:
        _replace_user_teams(db, current_user, merged_teams)
    if payload.campos:
        _replace_user_campos(db, current_user, merged_campos)
    return _serialize_favorites(current_user)

