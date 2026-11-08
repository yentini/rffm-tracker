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


def get_dokploy_api(base_url: str, api_key: str, endpoint: str) -> Any:
    """Execute a GET request against the Dokploy REST API."""
    url = f"{base_url.rstrip('/')}/api/{endpoint}"
    req = urllib.request.Request(
        url,
        headers={"x-api-key": api_key, "Accept": "application/json"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def configure_dockerfile_service(
    base_url: str,
    api_key: str,
    app_id: str,
    subpath: str,
) -> None:
    """Configure an application to build from GitHub using Dockerfile."""
    try:
        call_dokploy_api(base_url, api_key, "application.saveGithubProvider", {
            "applicationId": app_id,
            "owner": "yentini",
            "repository": "rffm-tracker",
            "branch": "main",
            "buildPath": subpath,
            "githubId": "A6B4uonQgjXermsJI14ts",
            "watchPaths": [],
            "enableSubmodules": False,
            "triggerType": "push",
        })
    except Exception:
        call_dokploy_api(base_url, api_key, "application.saveGitProvider", {
            "applicationId": app_id,
            "customGitUrl": REPO_URL,
            "customGitBranch": "main",
            "customGitBuildPath": subpath,
            "enableSubmodules": False,
            "watchPaths": [],
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


def setup_postgres(
    base_url: str,
    api_key: str,
    env_id: str,
    db_password: str = "RffmHomelabDb2026Secret",
) -> str:
    """Create and deploy a dedicated PostgreSQL 16 Alpine database in Dokploy."""
    pg = call_dokploy_api(base_url, api_key, "postgres.create", {
        "name": "rffm-db",
        "appName": "rffm-postgres-db",
        "databaseName": "rffm_db",
        "databaseUser": "rffm_user",
        "databasePassword": db_password,
        "dockerImage": "postgres:16-alpine",
        "environmentId": env_id,
    })
    pg_id = pg["postgresId"]
    pg_app_name = pg.get("appName", "rffm-postgres-db")
    call_dokploy_api(base_url, api_key, "postgres.deploy", {"postgresId": pg_id})
    return f"postgresql://rffm_user:{db_password}@{pg_app_name}:5432/rffm_db"


def setup_backend(
    base_url: str,
    api_key: str,
    env_id: str,
    database_url: str = "",
    jwt_secret: str = "rffm-tracker-homelab-jwt-secret-2026",
) -> str:
    """Create, configure, and deploy the RFFM FastAPI backend service."""
    back = call_dokploy_api(base_url, api_key, "application.create", {
        "name": "backend",
        "appName": "rffm-backend-rffmv2-ef66ut",
        "environmentId": env_id,
    })
    back_id = back["applicationId"]
    call_dokploy_api(base_url, api_key, "application.update", {
        "applicationId": back_id,
        "appName": "rffm-backend-rffmv2-ef66ut",
    })
    configure_dockerfile_service(base_url, api_key, back_id, "/backend")
    env_lines = [
        "PORT=8000",
        "ENVIRONMENT=production",
        f"JWT_SECRET_KEY={jwt_secret}",
    ]
    if database_url:
        env_lines.append(f"DATABASE_URL={database_url}")
    call_dokploy_api(base_url, api_key, "application.saveEnvironment", {
        "applicationId": back_id,
        "env": "\n".join(env_lines),
        "buildArgs": "",
        "buildSecrets": "",
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


def cleanup_existing_project(base_url: str, api_key: str, project_name: str) -> None:
    """Remove any existing project with the same name before a clean provision."""
    try:
        projects = get_dokploy_api(base_url, api_key, "project.all")
        for proj in projects:
            if proj.get("name") == project_name:
                pid = proj["projectId"]
                logger.info("Removing existing partial project %s (%s)...", project_name, pid)
                call_dokploy_api(base_url, api_key, "project.remove", {"projectId": pid})
    except Exception as exc:
        logger.warning("Could not inspect existing projects: %s", exc)


def restore_all() -> None:
    """Orchestrate full provisioning/restoration of Project RFFM on Dokploy."""
    secrets = load_env_file(SECRETS_ENV_PATH)
    base_url = secrets["DOKPLOY_URL"]
    api_key = secrets["DOKPLOY_API_KEY"]

    cleanup_existing_project(base_url, api_key, "RFFM")
    proj = call_dokploy_api(base_url, api_key, "project.create", {
        "name": "RFFM",
        "description": "RFEF / RFFM Tracker PWA & API",
    })
    project_id = proj.get("project", proj).get("projectId", "unknown")
    env_id = proj["environment"]["environmentId"]
    db_password = secrets.get("POSTGRES_PASSWORD", "RffmHomelabDb2026Secret")
    jwt_secret = secrets.get("JWT_SECRET_KEY", "rffm-tracker-homelab-jwt-secret-2026")
    db_url = setup_postgres(base_url, api_key, env_id, db_password)
    back_id = setup_backend(base_url, api_key, env_id, db_url, jwt_secret)
    front_id = setup_frontend(base_url, api_key, env_id)
    logger.info(
        "Full RFFM Homelab deployment triggered! projectId=%s envId=%s backId=%s frontId=%s",
        project_id,
        env_id,
        back_id,
        front_id,
    )


if __name__ == "__main__":
    restore_all()

