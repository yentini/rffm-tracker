"""Automated Provisioning & Disaster-Recovery Script for RFFM Tracker on Dokploy (Raspberry Pi 5).

Creates or reconstructs the RFFM project, backend, frontend, domains, and ports
on the Raspberry Pi 5 Dokploy instance in one command.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict
import urllib.error
import urllib.request

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DokployRffmRestore")

SECRETS_ENV_PATH = Path(__file__).resolve().parent / ".secrets.env"
REPO_URL = "https://github.com/yentini/rffm-tracker.git"


def load_env_file(file_path: Path) -> Dict[str, str]:
    """Read key-value pairs from a .env file without external dependencies.

    Args:
        file_path: Path to the .env file.

    Returns:
        Dictionary of parsed environment variables.

    Raises:
        FileNotFoundError: If the required env file does not exist.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Missing required configuration file: {file_path}")
    parsed: Dict[str, str] = {}
    for raw_line in file_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            parsed[key.strip()] = val.strip()
    return parsed


def call_dokploy_api(
    base_url: str,
    api_key: str,
    endpoint: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Execute a POST request against the Dokploy REST API.

    Args:
        base_url: Dokploy server URL (e.g., http://192.168.1.45:3000).
        api_key: Dokploy API token from Settings -> Profile.
        endpoint: API procedure name (e.g., project.create).
        payload: JSON body dictionary.

    Returns:
        Parsed JSON response dictionary.

    Raises:
        RuntimeError: If the HTTP request fails.
    """
    url = f"{base_url.rstrip('/')}/api/{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            logger.info("[OK] %s", endpoint)
            return json.loads(body) if body and body != "true" else {}
    except urllib.error.HTTPError as exc:
        err_msg = exc.read().decode("utf-8")
        logger.error("API error on %s (%d): %s", endpoint, exc.code, err_msg)
        raise RuntimeError(f"Dokploy API call failed: {endpoint}") from exc


def configure_dockerfile_service(
    base_url: str,
    api_key: str,
    app_id: str,
    subpath: str,
) -> None:
    """Configure an application to build from the Git repo using Dockerfile."""
    call_dokploy_api(base_url, api_key, "application.saveGitProvider", {
        "applicationId": app_id,
        "customGitUrl": REPO_URL,
        "customGitBranch": "main",
        "customGitBuildPath": subpath,
        "enableSubmodules": False,
    })
    call_dokploy_api(base_url, api_key, "application.saveBuildType", {
        "applicationId": app_id,
        "buildType": "dockerfile",
        "dockerfile": "Dockerfile",
        "dockerContextPath": subpath,
        "dockerBuildStage": "",
        "publishDirectory": None,
        "herokuVersion": "24",
        "railpackVersion": "0.15.4",
    })


def register_domain(base_url: str, api_key: str, app_id: str, host: str, port: int) -> None:
    """Register an HTTP domain rule in Traefik for the given Dokploy application."""
    call_dokploy_api(base_url, api_key, "domain.create", {
        "applicationId": app_id,
        "host": host,
        "port": port,
        "https": False,
        "certificateType": "none",
        "path": "/",
        "domainType": "application",
    })


def register_port(base_url: str, api_key: str, app_id: str, published: int, target: int) -> None:
    """Expose a container port on the Raspberry Pi LAN host."""
    call_dokploy_api(base_url, api_key, "port.create", {
        "applicationId": app_id,
        "publishedPort": published,
        "targetPort": target,
        "protocol": "tcp",
        "publishMode": "ingress",
    })


def setup_backend(base_url: str, api_key: str, env_id: str) -> str:
    """Create, configure, and deploy the RFFM FastAPI backend service."""
    back = call_dokploy_api(base_url, api_key, "application.create", {
        "name": "backend",
        "appName": "rffm-backend-rffmv2",
        "environmentId": env_id,
    })
    back_id = back["applicationId"]
    configure_dockerfile_service(base_url, api_key, back_id, "/backend")
    call_dokploy_api(base_url, api_key, "application.saveEnvironment", {
        "applicationId": back_id,
        "env": "PORT=8000\nENVIRONMENT=production",
        "createEnvFile": True,
    })
    register_domain(base_url, api_key, back_id, "rffm-api.cabrerizolab.net", 8000)
    register_domain(base_url, api_key, back_id, "rffm-backend.192.168.1.45.traefik.me", 8000)
    register_port(base_url, api_key, back_id, published=8001, target=8000)
    call_dokploy_api(base_url, api_key, "application.deploy", {"applicationId": back_id})
    return back_id


def setup_frontend(base_url: str, api_key: str, env_id: str) -> str:
    """Create, configure, and deploy the RFFM React/Nginx frontend service."""
    front = call_dokploy_api(base_url, api_key, "application.create", {
        "name": "frontend",
        "appName": "rffm-frontend-rffmv2",
        "environmentId": env_id,
    })
    front_id = front["applicationId"]
    configure_dockerfile_service(base_url, api_key, front_id, "/frontend")
    register_domain(base_url, api_key, front_id, "rffm.cabrerizolab.net", 80)
    register_domain(base_url, api_key, front_id, "rffm.192.168.1.45.traefik.me", 80)
    register_port(base_url, api_key, front_id, published=8081, target=80)
    call_dokploy_api(base_url, api_key, "application.deploy", {"applicationId": front_id})
    return front_id


def restore_all() -> None:
    """Orchestrate full provisioning/restoration of Project RFFM on Dokploy."""
    secrets = load_env_file(SECRETS_ENV_PATH)
    base_url = secrets["DOKPLOY_URL"]
    api_key = secrets["DOKPLOY_API_KEY"]

    proj = call_dokploy_api(base_url, api_key, "project.create", {
        "name": "RFFM",
        "description": "RFEF / RFFM Tracker PWA & API",
    })
    env_id = proj["environment"]["environmentId"]
    setup_backend(base_url, api_key, env_id)
    setup_frontend(base_url, api_key, env_id)
    logger.info("Full RFFM Homelab deployment triggered successfully!")


if __name__ == "__main__":
    restore_all()

