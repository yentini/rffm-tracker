"""Hermetic unit tests for backups/restore_dokploy.py."""
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backups.restore_dokploy import (
    load_env_file,
    restore_all,
    setup_backend,
    setup_frontend,
)


class TestRestoreDokploy(unittest.TestCase):
    def test_load_env_file_parses_key_values_and_ignores_comments(self):
        # Arrange
        with tempfile.TemporaryDirectory() as tmp_dir:
            env_path = Path(tmp_dir) / "test.env"
            env_path.write_text(
                "# Comment line\nDOKPLOY_URL=http://192.168.1.45:3000\nDOKPLOY_API_KEY=secret123\n",
                encoding="utf-8",
            )

            # Act
            parsed = load_env_file(env_path)

            # Assert
            self.assertEqual(parsed["DOKPLOY_URL"], "http://192.168.1.45:3000")
            self.assertEqual(parsed["DOKPLOY_API_KEY"], "secret123")

    def test_load_env_file_raises_when_missing(self):
        # Arrange
        missing_path = Path("/nonexistent/path/missing.env")

        # Act & Assert
        with self.assertRaises(FileNotFoundError):
            load_env_file(missing_path)

    @patch("backups.restore_dokploy.call_dokploy_api")
    def test_setup_backend_and_frontend_orchestrate_api_calls(self, mock_api: MagicMock):
        # Arrange
        mock_api.side_effect = [
            {"applicationId": "back-123"},
            {},
            {},
            {},
            {},
            {},
            {},
            {},
            {"applicationId": "front-456"},
            {},
            {},
            {},
            {},
            {},
            {},
        ]

        # Act
        back_id = setup_backend("http://192.168.1.45:3000", "key", "env-1")
        front_id = setup_frontend("http://192.168.1.45:3000", "key", "env-1")

        # Assert
        self.assertEqual(back_id, "back-123")
        self.assertEqual(front_id, "front-456")
        self.assertEqual(mock_api.call_count, 15)

    @patch("backups.restore_dokploy.setup_frontend")
    @patch("backups.restore_dokploy.setup_backend")
    @patch("backups.restore_dokploy.call_dokploy_api")
    @patch("backups.restore_dokploy.load_env_file")
    def test_restore_all_creates_project_and_services(
        self,
        mock_load_env: MagicMock,
        mock_api: MagicMock,
        mock_setup_back: MagicMock,
        mock_setup_front: MagicMock,
    ):
        # Arrange
        mock_load_env.return_value = {
            "DOKPLOY_URL": "http://192.168.1.45:3000",
            "DOKPLOY_API_KEY": "api-key-xyz",
        }
        mock_api.return_value = {"environment": {"environmentId": "env-prod-1"}}

        # Act
        restore_all()

        # Assert
        mock_api.assert_called_once_with(
            "http://192.168.1.45:3000",
            "api-key-xyz",
            "project.create",
            {"name": "RFFM", "description": "RFEF / RFFM Tracker PWA & API"},
        )
        mock_setup_back.assert_called_once_with(
            "http://192.168.1.45:3000", "api-key-xyz", "env-prod-1"
        )
        mock_setup_front.assert_called_once_with(
            "http://192.168.1.45:3000", "api-key-xyz", "env-prod-1"
        )

