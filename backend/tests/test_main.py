"""Unit tests for FastAPI endpoints using standard unittest and TestClient."""

import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import GameType, Season


class TestEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check_returns_ok(self):
        # Arrange & Act
        response = self.client.get("/health")

        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "rfef-tracker-backend")
        self.assertIn("timestamp", data)

    @patch("app.main.rfef_client.get_seasons", new_callable=AsyncMock)
    def test_get_seasons_returns_list(self, mock_get_seasons):
        # Arrange
        mock_get_seasons.return_value = [
            Season(cod_temporada="22", nombre="2026-2027", fecha_inicio="2026-07-01", fecha_fin="2027-09-01"),
            Season(cod_temporada="21", nombre="2025-2026", fecha_inicio="2025-07-01", fecha_fin="2026-06-30"),
        ]

        # Act
        response = self.client.get("/api/seasons")

        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 2)
        self.assertEqual(len(data["seasons"]), 2)
        self.assertEqual(data["seasons"][0]["cod_temporada"], "22")
        self.assertEqual(data["seasons"][0]["nombre"], "2026-2027")

    @patch("app.main.rfef_client.get_game_types", new_callable=AsyncMock)
    def test_get_game_types_returns_list(self, mock_get_game_types):
        # Arrange
        mock_get_game_types.return_value = [
            GameType(codigo_tipo_juego="1", nombre="Futbol-11"),
            GameType(codigo_tipo_juego="2", nombre="Futbol-7"),
        ]

        # Act
        response = self.client.get("/api/game-types")

        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 2)
        self.assertEqual(len(data["game_types"]), 2)
        self.assertEqual(data["game_types"][0]["codigo_tipo_juego"], "1")
        self.assertEqual(data["game_types"][0]["nombre"], "Futbol-11")

    @patch("app.main.rfef_client.get_competitions", new_callable=AsyncMock)
    def test_get_competitions_returns_list(self, mock_get_competitions):
        # Arrange
        from app.schemas import Competition
        mock_get_competitions.return_value = [
            Competition(
                codigo="26737923",
                nombre="DIVISION DE HONOR ALEVIN F-7",
                tipo_competicion="2",
                codigo_tipo_juego="2",
                tipo_juego="Futbol-7",
                codigo_categoria="13529377",
                nombre_categoria="DIVISION DE HONOR ALEV-F7",
            ),
        ]

        # Act
        response = self.client.get("/api/competitions?temporada=22&tipojuego=2")

        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["temporada"], "22")
        self.assertEqual(data["tipojuego"], "2")
        self.assertEqual(len(data["competitions"]), 1)
        self.assertEqual(data["competitions"][0]["codigo"], "26737923")
        self.assertEqual(data["competitions"][0]["nombre"], "DIVISION DE HONOR ALEVIN F-7")

    @patch("app.main.rfef_client.get_groups", new_callable=AsyncMock)
    def test_get_groups_returns_list(self, mock_get_groups):
        # Arrange
        from app.schemas import Group
        mock_get_groups.return_value = [
            Group(
                codigo="26737829",
                nombre="Grupo 1",
                total_jornadas="30",
                total_equipos="16",
                nombre_delegacion="CENTRAL R.F.F.M.",
            ),
        ]

        # Act
        response = self.client.get("/api/groups?competicion=26737828")

        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["competicion"], "26737828")
        self.assertEqual(len(data["groups"]), 1)
        self.assertEqual(data["groups"][0]["codigo"], "26737829")
        self.assertEqual(data["groups"][0]["nombre"], "Grupo 1")
        self.assertEqual(data["groups"][0]["total_equipos"], "16")

    @patch("app.main.rfef_client.get_calendario", new_callable=AsyncMock)
    def test_get_calendario_returns_data(self, mock_get_calendario):
        # Arrange
        from app.schemas import CalendarioResponse, Jornada, PartidoCalendario
        mock_get_calendario.return_value = CalendarioResponse(
            temporada="22",
            tipojuego="1",
            competicion="26737751",
            grupo="26737755",
            current_round=2,
            total_jornadas=1,
            rounds=[
                Jornada(
                    codjornada="1",
                    nombre_jornada="1 (26-09-2026)",
                    numero_jornada=1,
                    partidos=[
                        PartidoCalendario(
                            codacta="5601640",
                            equipo_local="FUNDACION ADF 'C'",
                            equipo_visitante="ESCUELA FUTBOL BARRIO PILAR 'B'",
                            goles_local="3",
                            goles_visitante="6",
                            campo="FUNDACION (HA)",
                            fecha="26-09-2026",
                            hora="09:00",
                        )
                    ],
                )
            ],
        )

        # Act
        url = "/api/calendario?temporada=22&tipojuego=1&competicion=26737751&grupo=26737755"
        response = self.client.get(url)

        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["temporada"], "22")
        self.assertEqual(data["current_round"], 2)
        self.assertEqual(data["total_jornadas"], 1)
        self.assertEqual(len(data["rounds"]), 1)
        self.assertEqual(data["rounds"][0]["codjornada"], "1")
        self.assertEqual(data["rounds"][0]["partidos"][0]["equipo_local"], "FUNDACION ADF 'C'")

    def test_get_partidos_returns_list(self):
        # Arrange & Act
        response = self.client.get("/api/partidos")

        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total", data)
        self.assertIn("partidos", data)
        self.assertIsInstance(data["partidos"], list)

    @patch("app.main.rfef_client.get_acta_partido", new_callable=AsyncMock)
    def test_get_acta_partido_returns_data(self, mock_get_acta):
        # Arrange
        from app.schemas import ActaPartido, GolActa, JugadorActa
        mock_get_acta.return_value = ActaPartido(
            codacta="5601640",
            nombre_competicion="PRIMERA CADETE",
            nombre_grupo="Grupo 4",
            jornada="1",
            fecha="26-09-2026",
            hora="09:00",
            campo="FUNDACION (HA)",
            equipo_local="FUNDACION ADF 'C'",
            equipo_visitante="ESCUELA FUTBOL BARRIO PILAR 'B'",
            goles_local="3",
            goles_visitante="6",
            goles_equipo_local=[
                GolActa(minuto="46", nombre_jugador="RODRIGUEZ, INIGO", tipo_gol="100")
            ],
            jugadores_equipo_local=[
                JugadorActa(dorsal="1", nombre_jugador="ABIEGA, MATIAS", titular="0", suplente="1")
            ],
        )

        # Act
        url = "/api/acta-partido?temporada=22&competicion=26737751&grupo=26737755&codacta=5601640"
        response = self.client.get(url)

        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["codacta"], "5601640")
        self.assertIn("game", data)
        self.assertEqual(data["game"]["equipo_local"], "FUNDACION ADF 'C'")
        self.assertEqual(data["game"]["goles_local"], "3")
        self.assertEqual(len(data["game"]["goles_equipo_local"]), 1)
        self.assertEqual(data["game"]["goles_equipo_local"][0]["minuto"], "46")


if __name__ == "__main__":
    unittest.main()

