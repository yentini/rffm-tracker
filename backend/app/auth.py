"""Authentication utilities: password hashing, HS256 JWT tokens, and Google OAuth."""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any, Dict

from fastapi import Depends, Header, HTTPException, status
import httpx
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserModel

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "rffm-tracker-homelab-jwt-secret-2026")
JWT_EXPIRATION_SECONDS = 30 * 24 * 3600  # 30 days
PBKDF2_ITERATIONS = 120_000


def _b64url_encode(data: bytes) -> str:
    """Encode bytes using URL-safe Base64 without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    """Decode a URL-safe Base64 string restoring padding."""
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode((segment + padding).encode("ascii"))


def hash_password(password: str) -> str:
    """Hash a plain-text password with PBKDF2-HMAC-SHA256 and a random salt.

    Args:
        password: Plain password string.

    Returns:
        Formatted hash string 'pbkdf2_sha256$<iterations>$<salt>$<digest>'.
    """
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${derived.hex()}"


def verify_password(password: str, stored_hash: str | None) -> bool:
    """Verify a plain-text password against a stored PBKDF2 hash.

    Args:
        password: Plain password provided by user.
        stored_hash: Stored password hash from database.

    Returns:
        True if the password matches, False otherwise.
    """
    if not stored_hash or "$" not in stored_hash:
        return False
    try:
        _, iter_str, salt, digest_hex = stored_hash.split("$", 3)
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iter_str),
        )
        return secrets.compare_digest(derived.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, email: str, name: str | None = None) -> str:
    """Create a signed HS256 JWT token for an authenticated user.

    Args:
        user_id: Database user ID.
        email: User email address.
        name: Optional display name.

    Returns:
        Signed JWT string.
    """
    header_b64 = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode("utf-8"))
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "iat": now,
        "exp": now + JWT_EXPIRATION_SECONDS,
    }
    payload_b64 = _b64url_encode(json.dumps(payload).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    sig = hmac.new(JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{payload_b64}.{_b64url_encode(sig)}"


def decode_access_token(token: str) -> Dict[str, Any]:
    """Verify and decode an HS256 JWT token.

    Args:
        token: JWT string.

    Returns:
        Decoded payload dictionary.

    Raises:
        ValueError: If signature is invalid or token is expired.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token format")
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = hmac.new(
        JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()
    if not secrets.compare_digest(_b64url_encode(expected_sig), sig_b64):
        raise ValueError("Invalid token signature")
    payload: Dict[str, Any] = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    if int(payload.get("exp", 0)) < int(time.time()):
        raise ValueError("Token has expired")
    return payload


async def verify_google_id_token(id_token: str) -> Dict[str, Any]:
    """Validate a Google OAuth ID token against Google's tokeninfo endpoint.

    Args:
        id_token: Google ID token credential from frontend.

    Returns:
        Dictionary with verified 'email', 'sub', and 'name'.

    Raises:
        HTTPException: If the Google token is invalid.
    """
    url = "https://oauth2.googleapis.com/tokeninfo"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params={"id_token": id_token})
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Google inválido o expirado.",
        )
    data = resp.json()
    expected_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if expected_client_id and data.get("aud") != expected_client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El Client ID de Google no coincide con este servidor.",
        )
    if not data.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta de Google no proporcionó un email válido.",
        )
    return {
        "email": str(data["email"]).strip().lower(),
        "sub": str(data.get("sub", "")),
        "name": data.get("name") or data.get("given_name") or str(data["email"]).split("@")[0],
    }


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> UserModel:
    """FastAPI dependency to extract and validate the current authenticated user."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Se requiere token Bearer.",
        )
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada. Vuelve a iniciar sesión.",
        ) from exc

    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario ya no existe.",
        )
    return user

