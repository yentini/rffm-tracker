"""Hermetic unit tests for authentication and cloud favorites endpoints."""

import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db, resolve_database_url
from app.main import app


class TestAuthAndFavorites(unittest.TestCase):
    """Test suite for /api/auth/* and /api/favorites/* using in-memory SQLite."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine
        )
        Base.metadata.create_all(bind=self.engine)

        def override_get_db():
            db = self.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def test_resolve_database_url_normalizes_postgres_and_defaults_sqlite(self):
        # Arrange & Act & Assert
        self.assertEqual(resolve_database_url(""), "sqlite:///./rffm.db")
        self.assertEqual(
            resolve_database_url("postgres://u:p@host:5432/db"),
            "postgresql://u:p@host:5432/db",
        )

    def test_auth_config_returns_google_client_id(self):
        # Arrange & Act
        res = self.client.get("/api/auth/config")

        # Assert
        self.assertEqual(res.status_code, 200)
        self.assertIn("google_client_id", res.json())

    def test_register_and_login_flow(self):
        # Arrange
        reg_payload = {
            "email": "Cesar@CabrerizoLab.net",
            "password": "securePassword123",
            "name": "César",
        }

        # Act: Register
        reg_res = self.client.post("/api/auth/register", json=reg_payload)

        # Assert: Created 201
        self.assertEqual(reg_res.status_code, 201)
        reg_data = reg_res.json()
        self.assertIn("access_token", reg_data)
        self.assertEqual(reg_data["user"]["email"], "cesar@cabrerizolab.net")
        self.assertEqual(reg_data["user"]["name"], "César")

        # Act: Duplicate registration returns 409
        dup_res = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(dup_res.status_code, 409)

        # Act: Login with valid credentials
        login_res = self.client.post(
            "/api/auth/login",
            json={"email": "cesar@cabrerizolab.net", "password": "securePassword123"},
        )
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["access_token"]

        # Act: Get profile (/api/auth/me)
        me_res = self.client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["email"], "cesar@cabrerizolab.net")

        # Act: Wrong password returns 401
        bad_login = self.client.post(
            "/api/auth/login",
            json={"email": "cesar@cabrerizolab.net", "password": "wrong"},
        )
        self.assertEqual(bad_login.status_code, 401)

    @patch("app.auth_routes.verify_google_id_token", new_callable=AsyncMock)
    def test_google_login_creates_and_authenticates_user(self, mock_verify_google):
        # Arrange
        mock_verify_google.return_value = {
            "email": "googleuser@gmail.com",
            "sub": "google-sub-999",
            "name": "Google User",
        }

        # Act
        res = self.client.post(
            "/api/auth/google", json={"credential": "fake-google-id-token-12345"}
        )

        # Assert
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["user"]["email"], "googleuser@gmail.com")
        self.assertEqual(data["user"]["auth_provider"], "google")

    def test_favorites_crud_and_guest_sync(self):
        # Arrange: Register user
        reg = self.client.post(
            "/api/auth/register",
            json={"email": "favs@cabrerizolab.net", "password": "pass1234"},
        ).json()
        headers = {"Authorization": f"Bearer {reg['access_token']}"}

        team_1 = {
            "teamId": "101",
            "teamName": "A.D. UNION ADARVE 'A'",
            "teamShield": "https://appweb.rffm.es/adarve.png",
            "seasonId": "22",
            "seasonName": "2026-2027",
            "gameTypeId": "1",
            "gameTypeName": "Fútbol 11",
            "competitionId": "26737751",
            "competitionName": "PRIMERA CADETE",
            "groupId": "26737755",
            "groupName": "Grupo 4",
            "savedAt": 1700000001,
        }
        team_2 = {
            **team_1,
            "teamId": "202",
            "teamName": "C.F. POZUELO",
            "savedAt": 1700000002,
        }
        campo_1 = {
            "codigoCampo": "203",
            "nombreCampo": "FUNDACION (HA)",
            "localidad": "Madrid",
            "direccion": "Calle Braojos 21",
            "clubAsociado": "A.D. FUNDACION",
            "superficie": "Hierba Artificial",
            "tipoCampo": "Fútbol 11",
            "savedAt": 1700000003,
        }

        # Act 1: Save favorite teams
        put_teams = self.client.put(
            "/api/favorites/teams", json={"teams": [team_1]}, headers=headers
        )
        self.assertEqual(put_teams.status_code, 200)
        self.assertEqual(len(put_teams.json()["teams"]), 1)

        # Act 2: Sync guest favorites (team_1 duplicate + team_2 new + campo_1 new)
        sync_res = self.client.post(
            "/api/favorites/sync",
            json={"teams": [team_1, team_2], "campos": [campo_1]},
            headers=headers,
        )

        # Assert: Deduplicated and ordered
        self.assertEqual(sync_res.status_code, 200)
        synced = sync_res.json()
        self.assertEqual(len(synced["teams"]), 2)
        self.assertEqual(synced["teams"][0]["teamId"], "101")
        self.assertEqual(synced["teams"][1]["teamId"], "202")
        self.assertEqual(len(synced["campos"]), 1)
        self.assertEqual(synced["campos"][0]["codigoCampo"], "203")

        # Act 3: Reorder teams (make team_2 primary at index 0)
        reorder_res = self.client.put(
            "/api/favorites/teams",
            json={"teams": [team_2, team_1]},
            headers=headers,
        )
        self.assertEqual(reorder_res.status_code, 200)
        self.assertEqual(reorder_res.json()["teams"][0]["teamId"], "202")

