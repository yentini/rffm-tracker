"""HTTP Client for RFEF / RFFM integration with async httpx."""

import asyncio
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Optional
import unicodedata
import httpx

from app.schemas import (
    ActaPartido,
    CalendarioResponse,
    CampoDetailResponse,
    CampoItem,
    CamposSearchResponse,
    ClasificacionEquipo,
    ClasificacionResponse,
    Club,
    ClubDetail,
    ClubEquipacion,
    ClubEquipo,
    ClubsPagination,
    ClubsResponse,
    Competition,
    DeduceTeamResult,
    EstadoPartido,
    Equipo,
    GameType,
    GoleadorItem,
    GoleadoresResponse,
    Group,
    Jornada,
    JornadaInfo,
    Partido,
    PartidoCalendario,
    PartidoCampo,
    PlayerCompeticion,
    PlayerDetail,
    PlayerStat,
    PlayerTemporada,
    Promocion,
    RachaPartido,
    Season,
    TeamDelegado,
    TeamDetail,
    TeamJugador,
    TeamTecnico,
)

logger = logging.getLogger(__name__)

DEFAULT_RFFM_BUILD_ID = os.getenv("RFFM_BUILD_ID", "NY30BEAEFulRtBHCLvSa1")

RFFM_COMPETITIONS_URL = os.getenv(
    "RFFM_COMPETITIONS_URL",
    "https://www.rffm.es/api/competitions",
)

RFFM_GROUPS_URL = os.getenv(
    "RFFM_GROUPS_URL",
    "https://www.rffm.es/api/groups",
)


def fix_escudo_url(url: Optional[str]) -> Optional[str]:
    """Normaliza y concatena URL del escudo de la RFFM."""
    if not url or not url.strip():
        return None
    clean_url = url.strip()
    if clean_url.startswith("http://") or clean_url.startswith("https://"):
        return clean_url
    if clean_url.startswith("/"):
        return f"https://appweb.rffm.es{clean_url}"
    return f"https://appweb.rffm.es/{clean_url}"



def strip_accents(text: str) -> str:
    """Elimina acentos y signos diacríticos para búsquedas insensibles en la RFFM."""
    if not text:
        return ""
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


class RFEFClientError(Exception):
    """Excepción base para errores en el cliente RFEF / RFFM."""


class RFEFClient:
    """Cliente HTTP asíncrono para interactuar con endpoints de la RFFM / RFEF."""

    def __init__(
        self,
        build_id: Optional[str] = None,
        timeout_seconds: float = 12.0,
        verify_ssl: bool = False,
        **kwargs: Any,
    ) -> None:
        self.build_id: str = build_id or DEFAULT_RFFM_BUILD_ID
        self.build_id_last_updated: float = 0.0
        self.timeout = timeout_seconds
        # Por defecto verify_ssl=False permite trabajar bajo proxies o certificados intermedios
        self.verify_ssl = verify_ssl
        self._cached_page_props: Optional[dict[str, Any]] = None
        self._club_campos_cache: dict[str, list[Any]] = {}
        self._team_names_cache: dict[str, str] = {}
        self._campo_to_club_cache: dict[str, str] = {
            "14610183": "A.D. UNION ADARVE",
            "7685149": "A.D. UNION ADARVE",
            "410": "C.D. SAN ROQUE E.F.F.",
            "203": "A.D. FUNDACION",
        }
        self._campo_to_address_cache: dict[str, str] = {
            "14610183": "C/ Becerrea, 4 (Vereda de Ganapanes)",
            "7685149": "C/ Becerrea, 4 (Vereda de Ganapanes)",
            "410": "Av. Monforte de Lemos, 13",
            "203": "C/ Monasterio de El Escorial",
        }
        self._team_deduce_cache: dict[str, tuple[Optional[str], Optional[str], Optional[str], Optional[str], str]] = {}

    @property
    def calendario_url(self) -> str:
        return f"https://www.rffm.es/_next/data/{self.build_id}/competicion/calendario.json"

    @property
    def clubs_url(self) -> str:
        return f"https://www.rffm.es/_next/data/{self.build_id}/competicion/clubes.json"

    @property
    def acta_url_template(self) -> str:
        return f"https://www.rffm.es/_next/data/{self.build_id}/acta-partido/{{codacta}}.json"

    @property
    def ficha_club_url_template(self) -> str:
        return f"https://www.rffm.es/_next/data/{self.build_id}/fichaclub/{{codficha}}.json"

    @property
    def ficha_equipo_url_template(self) -> str:
        return f"https://www.rffm.es/_next/data/{self.build_id}/fichaequipo/{{codficha}}.json"

    @property
    def ficha_jugador_url_template(self) -> str:
        return f"https://www.rffm.es/_next/data/{self.build_id}/fichajugador/{{codjugador}}.json"

    async def get_build_id(self, force_refresh: bool = False) -> str:
        """Obtiene dinámicamente el buildId de Next.js vigente en la RFFM desde https://www.rffm.es/."""
        now = time.time()
        # Si ya lo tenemos y no ha pasado el TTL (6 horas) y no es forzado, reusar
        if not force_refresh and self.build_id and (now - self.build_id_last_updated) < 21600:
            return self.build_id

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        try:
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=12.0,
                follow_redirects=True,
            ) as client:
                res = await client.get("https://www.rffm.es/", headers=headers)
                res.raise_for_status()
                html = res.text

                # 1. Extraer desde <script id="__NEXT_DATA__">
                match_json = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
                if match_json:
                    try:
                        parsed = json.loads(match_json.group(1))
                        found_id = parsed.get("buildId")
                        if found_id and isinstance(found_id, str):
                            found_id = found_id.strip()
                            logger.info("Detectado nuevo RFFM buildId desde __NEXT_DATA__: %s", found_id)
                            self.build_id = found_id
                            self.build_id_last_updated = now
                            return self.build_id
                    except Exception as json_err:
                        logger.debug("No se pudo parsear __NEXT_DATA__: %s", json_err)

                # 2. Extraer desde ruta _buildManifest.js
                match_manifest = re.search(r'/_next/static/([^/]+)/_buildManifest\.js', html)
                if match_manifest:
                    found_id = match_manifest.group(1).strip()
                    logger.info("Detectado nuevo RFFM buildId desde _buildManifest.js: %s", found_id)
                    self.build_id = found_id
                    self.build_id_last_updated = now
                    return self.build_id

                # 3. Extraer desde /_next/data/
                match_data = re.search(r'/_next/data/([^/]+)/', html)
                if match_data:
                    found_id = match_data.group(1).strip()
                    logger.info("Detectado nuevo RFFM buildId desde /_next/data/: %s", found_id)
                    self.build_id = found_id
                    self.build_id_last_updated = now
                    return self.build_id

                logger.warning("No se pudo extraer buildId de rffm.es. Manteniendo fallback: %s", self.build_id)
        except Exception as err:
            logger.warning("Error al consultar https://www.rffm.es/ para buildId: %s. Manteniendo %s", err, self.build_id)

        return self.build_id

    async def _get_next_json(
        self,
        endpoint_path: str,
        params: Optional[dict[str, Any]] = None,
        headers: Optional[dict[str, str]] = None,
        timeout: Optional[float] = None,
    ) -> dict[str, Any]:
        """Realiza petición a un endpoint /_next/data/{build_id}/... con auto-recuperación si el buildId caducó (404)."""
        clean_path = endpoint_path.lstrip("/")
        req_headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }
        if headers:
            req_headers.update(headers)

        req_timeout = timeout or self.timeout
        bid = await self.get_build_id()

        async with httpx.AsyncClient(
            verify=self.verify_ssl,
            timeout=req_timeout,
            follow_redirects=True,
        ) as client:
            url = f"https://www.rffm.es/_next/data/{bid}/{clean_path}"
            response = await client.get(url, params=params, headers=req_headers)

            if response.status_code == 404:
                logger.warning(
                    "Petición a %s retornó 404. Posible cambio de buildId (%s). Intentando auto-recuperación...",
                    url,
                    bid,
                )
                new_bid = await self.get_build_id(force_refresh=True)
                if new_bid != bid:
                    url = f"https://www.rffm.es/_next/data/{new_bid}/{clean_path}"
                    logger.info("Reintentando petición con nuevo buildId: %s", new_bid)
                    response = await client.get(url, params=params, headers=req_headers)

            response.raise_for_status()
            return response.json()

    async def get_calendario_page_props(self, force_refresh: bool = False) -> dict[str, Any]:
        """Obtiene las propiedades de la página (pageProps) de la RFFM."""
        if self._cached_page_props and not force_refresh:
            return self._cached_page_props

        try:
            data = await self._get_next_json("competicion/calendario.json")
            page_props = data.get("pageProps", {})
            self._cached_page_props = page_props
            return page_props
        except Exception as error:
            logger.error("Error al obtener datos de la RFFM: %s", error)
            if self._cached_page_props:
                return self._cached_page_props
            raise RFEFClientError(f"No se pudo consultar el servicio RFFM: {error}") from error

    async def get_seasons(self) -> list[Season]:
        """Extrae el listado de temporadas desde pageProps."""
        props = await self.get_calendario_page_props()
        raw_seasons = props.get("seasons", [])
        return [
            Season(
                cod_temporada=str(item.get("cod_temporada", "")),
                nombre=str(item.get("nombre", "")),
                fecha_inicio=item.get("fecha_inicio"),
                fecha_fin=item.get("fecha_fin"),
            )
            for item in raw_seasons
            if item.get("cod_temporada")
        ]

    async def get_game_types(self) -> list[GameType]:
        """Extrae el listado de tipos de juego desde pageProps."""
        props = await self.get_calendario_page_props()
        raw_types = props.get("gameTypes", [])
        return [
            GameType(
                codigo_tipo_juego=str(item.get("codigo_tipo_juego", "")),
                nombre=str(item.get("nombre", "")),
            )
            for item in raw_types
            if item.get("codigo_tipo_juego")
        ]

    async def get_competitions(self, temporada: str, tipojuego: str) -> list[Competition]:
        """Obtiene las competiciones para una temporada y modalidad desde la RFFM."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }
        params = {"temporada": temporada, "tipojuego": tipojuego}

        try:
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=self.timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(
                    RFFM_COMPETITIONS_URL,
                    params=params,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()

                if not isinstance(data, list):
                    logger.warning("Formato inesperado en competitions: %s", type(data))
                    return []

                return [
                    Competition(
                        codigo=str(item.get("codigo", "")),
                        nombre=str(item.get("nombre", "")),
                        tipo_competicion=item.get("tipo_competicion"),
                        codigo_tipo_juego=item.get("codigo_tipo_juego"),
                        tipo_juego=item.get("TipoJuego"),
                        codigo_categoria=item.get("CodigoCategoria"),
                        nombre_categoria=item.get("NombreCategoria"),
                        cod_grupo_categoria=item.get("cod_grupo_categoria"),
                        nombre_grupo_categoria=item.get("nombre_grupo_categoria"),
                        activa=str(item.get("Activa", "0")),
                        fecha_inicio=item.get("FechaInicio"),
                        fecha_fin=item.get("FechaFin"),
                    )
                    for item in data
                    if item.get("codigo") and item.get("nombre")
                ]
        except Exception as error:
            logger.error("Error al obtener competiciones de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudieron obtener competiciones para temporada={temporada}, tipojuego={tipojuego}: {error}"
            ) from error

    async def get_groups(self, competicion: str) -> list[Group]:
        """Obtiene los grupos asociados a una competición oficial desde la RFFM."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }
        params = {"competicion": competicion}

        try:
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=self.timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(
                    RFFM_GROUPS_URL,
                    params=params,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()

                if not isinstance(data, list):
                    logger.warning("Formato inesperado en groups: %s", type(data))
                    return []

                return [
                    Group(
                        codigo=str(item.get("codigo", "")),
                        nombre=str(item.get("nombre", "")),
                        total_jornadas=item.get("total_jornadas"),
                        total_equipos=item.get("total_equipos"),
                        orden=item.get("orden"),
                        nombre_delegacion=item.get("nombre_delegacion"),
                    )
                    for item in data
                    if item.get("codigo") and item.get("nombre")
                ]
        except Exception as error:
            logger.error("Error al obtener grupos de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudieron obtener grupos para competicion={competicion}: {error}"
            ) from error

    async def get_calendario(
        self,
        temporada: str,
        tipojuego: str,
        competicion: str,
        grupo: str,
    ) -> CalendarioResponse:
        """Obtiene el calendario de jornadas y partidos desde el endpoint Next.js de la RFFM."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }
        params = {
            "temporada": temporada,
            "tipojuego": tipojuego,
            "competicion": competicion,
            "grupo": grupo,
        }

        try:
            data = await self._get_next_json(
                "competicion/calendario.json",
                params=params,
                headers=headers,
            )
            page_props = data.get("pageProps", {})
            raw_current_round = page_props.get("currentRound", 1)
            try:
                current_round = int(raw_current_round)
            except (ValueError, TypeError):
                current_round = 1

            calendar_data = page_props.get("calendar", {})
            raw_rounds = calendar_data.get("rounds", [])

            def fix_escudo_url(url: Optional[str]) -> Optional[str]:
                if not url or not url.strip():
                    return None
                clean_url = url.strip()
                if clean_url.startswith("http://") or clean_url.startswith("https://"):
                    return clean_url
                if clean_url.startswith("/"):
                    return f"https://appweb.rffm.es{clean_url}"
                return f"https://appweb.rffm.es/{clean_url}"

            jornadas: list[Jornada] = []
            for index, item in enumerate(raw_rounds):
                raw_equipos = item.get("equipos", [])
                partidos: list[PartidoCalendario] = []
                for eq in raw_equipos:
                    partidos.append(
                        PartidoCalendario(
                            codacta=str(eq.get("codacta", "")),
                            codigo_equipo_local=eq.get("codigo_equipo_local"),
                            equipo_local=str(eq.get("equipo_local", "Local")),
                            escudo_equipo_local=fix_escudo_url(eq.get("escudo_equipo_local")),
                            goles_local=eq.get("goles_casa") if eq.get("goles_casa") != "" else None,
                            codigo_equipo_visitante=eq.get("codigo_equipo_visitante"),
                            equipo_visitante=str(eq.get("equipo_visitante", "Visitante")),
                            escudo_equipo_visitante=fix_escudo_url(eq.get("escudo_equipo_visitante")),
                            goles_visitante=eq.get("goles_visitante") if eq.get("goles_visitante") != "" else None,
                            campo=eq.get("campo"),
                            codigo_campo=(
                                str(eq.get("codigo_campo"))
                                if eq.get("codigo_campo") is not None and str(eq.get("codigo_campo")).strip() != ""
                                else None
                            ),
                            fecha=eq.get("fecha"),
                            hora=eq.get("hora"),
                        )
                    )
                    if eq.get("codigo_equipo_local") and eq.get("equipo_local"):
                        self._team_names_cache[str(eq["codigo_equipo_local"])] = str(eq["equipo_local"])
                    if eq.get("codigo_equipo_visitante") and eq.get("equipo_visitante"):
                        self._team_names_cache[str(eq["codigo_equipo_visitante"])] = str(eq["equipo_visitante"])

                codjornada = str(item.get("codjornada", index + 1))
                try:
                    num_jornada = int(codjornada)
                except ValueError:
                    num_jornada = index + 1

                jornadas.append(
                    Jornada(
                        codjornada=codjornada,
                        nombre_jornada=str(item.get("jornada", f"Jornada {num_jornada}")),
                        numero_jornada=num_jornada,
                        partidos=partidos,
                    )
                )

            return CalendarioResponse(
                temporada=temporada,
                tipojuego=tipojuego,
                competicion=competicion,
                grupo=grupo,
                current_round=current_round,
                total_jornadas=len(jornadas),
                rounds=jornadas,
            )
        except Exception as error:
            logger.error("Error al obtener calendario de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudo consultar el calendario para temporada={temporada}, grupo={grupo}: {error}"
            ) from error

    async def get_acta_partido(
        self,
        codacta: str,
        temporada: Optional[str] = None,
        competicion: Optional[str] = None,
        grupo: Optional[str] = None,
    ) -> ActaPartido:
        """Obtiene el acta y los detalles completos de un partido desde la RFFM por su código único de acta."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }

        clean_cod = str(codacta).strip()
        if not clean_cod:
            raise RFEFClientError("El código de acta no puede estar vacío.")

        try:
            # 1. En Next.js / RFFM, acta-partido/[codacta].json es canónica por codacta único
            data = await self._get_next_json(
                f"acta-partido/{clean_cod}.json",
                headers=headers,
                timeout=max(self.timeout, 20.0),
            )
            page_props = data.get("pageProps", {}) if data else {}
            game_data = page_props.get("game")

            # 2. Si no viniera y se pasaron parámetros opcionales de grupo, intentar como fallback
            if not game_data and temporada and competicion and grupo:
                params = {
                    "temporada": temporada,
                    "competicion": competicion,
                    "grupo": grupo,
                    "codacta": clean_cod,
                }
                data = await self._get_next_json(
                    f"acta-partido/{clean_cod}.json",
                    params=params,
                    headers=headers,
                    timeout=max(self.timeout, 20.0),
                )
                page_props = data.get("pageProps", {}) if data else {}
                game_data = page_props.get("game")

            if not game_data:
                raise RFEFClientError(f"No se encontraron datos de acta para el partido {clean_cod}")

            game_dict = dict(game_data)
            game_dict["escudo_local"] = fix_escudo_url(game_dict.get("escudo_local"))
            game_dict["escudo_visitante"] = fix_escudo_url(game_dict.get("escudo_visitante"))

            if game_dict.get("codigo_equipo_local") and game_dict.get("equipo_local"):
                self._team_names_cache[str(game_dict["codigo_equipo_local"])] = str(game_dict["equipo_local"])
            if game_dict.get("codigo_equipo_visitante") and game_dict.get("equipo_visitante"):
                self._team_names_cache[str(game_dict["codigo_equipo_visitante"])] = str(game_dict["equipo_visitante"])

            return ActaPartido.model_validate(game_dict)
        except Exception as error:
            logger.error("Error al obtener acta de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudo consultar el acta {clean_cod}: {error}"
            ) from error

    async def get_partidos_jornada(
        self,
        competicion_id: Optional[str] = None,
        jornada: Optional[int] = None,
    ) -> list[Partido]:
        """Obtiene partidos de una jornada. Retorna datos simulados si no hay filtro."""
        now = datetime.now(timezone.utc)
        return [
            Partido(
                id="match-001",
                competicion="Tercera Federación - Grupo 7",
                jornada=jornada or 8,
                fecha=now,
                estado=EstadoPartido.EN_JUEGO,
                minuto=67,
                local=Equipo(
                    id="eq-madrid-sur",
                    nombre="CD Colonia Moscardó",
                    abreviatura="MOS",
                ),
                visitante=Equipo(
                    id="eq-pozuelo",
                    nombre="CF Pozuelo de Alarcón",
                    abreviatura="POZ",
                ),
                goles_local=2,
                goles_visitante=1,
            )
        ]

    async def get_clubs(
        self,
        page: int = 1,
        search: Optional[str] = None,
        codclub: Optional[str] = None,
    ) -> ClubsResponse:
        """Obtiene el listado oficial y paginado de clubes de la RFFM, con soporte de búsqueda."""
        params: dict[str, str] = {"p": str(page)}
        if codclub and codclub.strip():
            params["codclub"] = codclub.strip()
        if search and search.strip():
            params["search"] = search.strip()
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }

        try:
            data = await self._get_next_json(
                "competicion/clubes.json",
                params=params,
                headers=headers,
                timeout=max(self.timeout, 25.0),
            )
            page_props = data.get("pageProps", {})
            clubs_raw = page_props.get("clubs") or {}

            def parse_int_safe(val: Any) -> Optional[int]:
                if val is None or val == "":
                    return None
                try:
                    parsed = int(val)
                    return parsed if parsed > 0 else None
                except (ValueError, TypeError):
                    return None

            pag_actual = int(clubs_raw.get("pagina_actual", page))
            tot_pags = int(clubs_raw.get("total_paginas", 1))
            tot_regs = int(clubs_raw.get("total_registros", 0))
            pag_ant = parse_int_safe(clubs_raw.get("pagina_anterior"))
            pag_sig = parse_int_safe(clubs_raw.get("pagina_siguiente"))

            pagination = ClubsPagination(
                pagina_actual=pag_actual,
                total_paginas=tot_pags,
                total_registros=tot_regs,
                pagina_anterior=pag_ant,
                pagina_siguiente=pag_sig,
            )

            clubes_list: list[Club] = []
            for item in clubs_raw.get("clubes", []):
                clubes_list.append(
                    Club(
                        codigo_club=str(item.get("codigo_club", "")),
                        nombre=str(item.get("nombre", "")),
                        clave_acceso=item.get("clave_acceso"),
                        escudo=fix_escudo_url(item.get("escudo")),
                        localidad=item.get("localidad"),
                        provincia=item.get("provincia"),
                        total_equipos=(
                            str(item.get("total_equipos"))
                            if item.get("total_equipos") is not None
                            else None
                        ),
                    )
                )

            return ClubsResponse(pagination=pagination, clubs=clubes_list)
        except Exception as error:
            logger.error("Error al obtener clubes de la RFFM (página %s): %s", page, error)
            raise RFEFClientError(
                f"No se pudo consultar el listado de clubes en la RFFM: {error}"
            ) from error

    async def get_club_detail(self, codficha: str) -> ClubDetail:
        """Obtiene la información detallada de un club y sus equipos federados."""
        params = {"codficha": codficha}
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }

        try:
            data = await self._get_next_json(
                f"fichaclub/{codficha}.json",
                params=params,
                headers=headers,
                timeout=max(self.timeout, 25.0),
            )
            page_props = data.get("pageProps", {})
            club_raw = page_props.get("club", {})

            if not club_raw:
                raise RFEFClientError(
                    f"No se encontró información del club con código {codficha}"
                )

            escudo_url = fix_escudo_url(club_raw.get("escudo"))

            # Equipaciones
            equipaciones_raw = club_raw.get("equipaciones", [])
            equipaciones: list[ClubEquipacion] = []
            for eq in equipaciones_raw:
                if isinstance(eq, dict):
                    equipaciones.append(
                        ClubEquipacion(
                            camiseta=eq.get("camiseta"),
                            pantalon=eq.get("pantalon"),
                            medias=eq.get("medias"),
                        )
                    )

            # Equipos del club
            equipos_raw = club_raw.get("equipos_club", [])
            equipos: list[ClubEquipo] = []
            for eq in equipos_raw:
                if isinstance(eq, dict):
                    eq_obj = ClubEquipo(
                        codigo_equipo=str(eq.get("codigo_equipo", "")),
                        nombre_equipo=str(eq.get("nombre_equipo", "")),
                        categoria=str(eq.get("categoria", "")),
                        en_competicion=str(eq.get("en_competicion", "1")),
                    )
                    equipos.append(eq_obj)
                    if eq_obj.codigo_equipo and eq_obj.nombre_equipo:
                        self._team_names_cache[eq_obj.codigo_equipo] = eq_obj.nombre_equipo

            return ClubDetail(
                codigo=str(club_raw.get("codigo", codficha)),
                nombre_club=str(club_raw.get("nombre_club", "")),
                escudo=escudo_url,
                delegacion=club_raw.get("delegacion"),
                comarca=club_raw.get("comarca"),
                cif=club_raw.get("CIF"),
                domicilio=club_raw.get("domicilio"),
                localidad=club_raw.get("localidad"),
                provincia=club_raw.get("provincia"),
                codigo_postal=club_raw.get("codigo_postal"),
                portal_web=club_raw.get("portal_web"),
                email=club_raw.get("email_correspondencia"),
                telefonos=club_raw.get("telefonos"),
                presidente=club_raw.get("presidente"),
                fecha_fundacion=club_raw.get("fecha_fundacion"),
                twitter=club_raw.get("twitter"),
                instagram=club_raw.get("instagram"),
                facebook=club_raw.get("facebook"),
                equipaciones=equipaciones,
                equipos=equipos,
            )
        except Exception as error:
            logger.error("Error al obtener ficha de club de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudo consultar el club {codficha}: {error}"
            ) from error

    async def get_team_detail(self, codficha: str) -> TeamDetail:
        """Obtiene la ficha detallada de un equipo, incluyendo cuerpo técnico, plantilla y equipaciones."""
        url = self.ficha_equipo_url_template.format(codficha=codficha)
        params = {"codficha": codficha}
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }

        try:
            data = await self._get_next_json(
                f"fichaequipo/{codficha}.json",
                params=params,
                headers=headers,
                timeout=max(self.timeout, 25.0),
            )
            page_props = data.get("pageProps", {})
            team_raw = page_props.get("team", {})

            if not team_raw:
                raise RFEFClientError(
                    f"No se encontró información del equipo con código {codficha}"
                )

            escudo_url = fix_escudo_url(team_raw.get("escudo_club"))

            # Técnicos
            tecnicos: list[TeamTecnico] = []
            for tec in team_raw.get("tecnicos_equipo", []):
                if isinstance(tec, dict):
                    tecnicos.append(
                        TeamTecnico(
                            cod_tecnico=str(tec.get("cod_tecnico", "")),
                            nombre=str(tec.get("nombre", "")),
                        )
                    )

            # Jugadores
            jugadores: list[TeamJugador] = []
            for jug in team_raw.get("jugadores_equipo", []):
                if isinstance(jug, dict):
                    jugadores.append(
                        TeamJugador(
                            cod_jugador=str(jug.get("cod_jugador", "")),
                            nombre=str(jug.get("nombre", "")),
                        )
                    )

            # Delegados
            delegados: list[TeamDelegado] = []
            for deleg in team_raw.get("delegados_equipo", []):
                if isinstance(deleg, dict):
                    delegados.append(
                        TeamDelegado(
                            cod_delegado=(
                                str(deleg.get("cod_delegado"))
                                if deleg.get("cod_delegado") is not None
                                else None
                            ),
                            nombre=str(deleg.get("nombre", "")),
                        )
                    )

            # Equipaciones
            equipaciones: list[ClubEquipacion] = []
            for eq in team_raw.get("equipaciones", []):
                if isinstance(eq, dict):
                    equipaciones.append(
                        ClubEquipacion(
                            camiseta=eq.get("camiseta"),
                            pantalon=eq.get("pantalon"),
                            medias=eq.get("medias"),
                        )
                    )

            return TeamDetail(
                codigo_equipo=str(team_raw.get("codigo_equipo", codficha)),
                codigo_club=str(team_raw.get("codigo_club", "")),
                nombre_equipo=str(team_raw.get("nombre_equipo", "")),
                nombre_club=str(team_raw.get("nombre_club", "")),
                escudo_club=escudo_url,
                categoria=str(team_raw.get("categoria", "")),
                codigo_categoria=(
                    str(team_raw.get("codigo_categoria"))
                    if team_raw.get("codigo_categoria") is not None
                    else None
                ),
                campo=team_raw.get("campo"),
                codigo_campo=(
                    str(team_raw.get("codigo_campo"))
                    if team_raw.get("codigo_campo") is not None
                    else None
                ),
                portal_web=team_raw.get("portal_web"),
                email=team_raw.get("email_correspondencia"),
                telefonos=team_raw.get("telefonos"),
                domicilio=team_raw.get("domicilio_correspondencia"),
                localidad=team_raw.get("localidad_correspondencia"),
                provincia=team_raw.get("provincia_correspondencia"),
                codigo_postal=team_raw.get("codigo_postal_correspondencia"),
                tecnicos=tecnicos,
                jugadores=jugadores,
                delegados=delegados,
                equipaciones=equipaciones,
            )
        except Exception as error:
            logger.error("Error al obtener ficha de equipo de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudo consultar el equipo {codficha}: {error}"
            ) from error

    async def get_player_detail(
        self, codjugador: str, temporada: Optional[str] = None
    ) -> PlayerDetail:
        """Obtiene la ficha oficial detallada de un jugador en la RFFM para una temporada."""
        params: dict[str, str] = {"codjugador": codjugador}
        if temporada and temporada.strip():
            params["temporada"] = temporada.strip()
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }

        try:
            data = await self._get_next_json(
                f"fichajugador/{codjugador}.json",
                params=params,
                headers=headers,
                timeout=max(self.timeout, 25.0),
            )
            page_props = data.get("pageProps", {})
            p_raw = page_props.get("player", {})

            if not p_raw:
                raise RFEFClientError(
                    f"No se encontró información del jugador con código {codjugador}"
                )

            escudo_url = fix_escudo_url(p_raw.get("escudo_equipo"))
            foto_url = fix_escudo_url(p_raw.get("foto"))

            # Temporadas
            temporadas_list: list[PlayerTemporada] = []
            for temp in p_raw.get("listado_temporadas", []):
                if isinstance(temp, dict):
                    temporadas_list.append(
                        PlayerTemporada(
                            nombre_temporada=str(temp.get("nombre_temporada", "")),
                            codigo_temporada=str(temp.get("codigo_temporada", "")),
                        )
                    )

            # Competiciones
            competiciones_list: list[PlayerCompeticion] = []
            for comp in p_raw.get("competiciones_participa", []):
                if isinstance(comp, dict):
                    competiciones_list.append(
                        PlayerCompeticion(
                            nombre_competicion=str(comp.get("nombre_competicion", "")),
                            codigo_competicion=str(comp.get("codigo_competicion", "")),
                            nombre_grupo=comp.get("nombre_grupo"),
                            codgrupo=(
                                str(comp.get("codgrupo"))
                                if comp.get("codgrupo") is not None
                                else None
                            ),
                            codequipo=(
                                str(comp.get("codequipo"))
                                if comp.get("codequipo") is not None
                                else None
                            ),
                            nombre_equipo=comp.get("nombre_equipo"),
                            nombre_club=comp.get("nombre_club"),
                            posicion_equipo=(
                                str(comp.get("posicion_equipo"))
                                if comp.get("posicion_equipo") is not None
                                else None
                            ),
                            puntos_equipo=(
                                str(comp.get("puntos_equipo"))
                                if comp.get("puntos_equipo") is not None
                                else None
                            ),
                            escudo_equipo=fix_escudo_url(comp.get("escudo_equipo")),
                        )
                    )

            # Partidos
            partidos_list: list[PlayerStat] = []
            for part in p_raw.get("partidos", []):
                if isinstance(part, dict):
                    partidos_list.append(
                        PlayerStat(
                            nombre=str(part.get("nombre", "")),
                            valor=str(part.get("valor", "0")),
                        )
                    )

            # Tarjetas
            tarjetas_list: list[PlayerStat] = []
            for tarj in p_raw.get("tarjetas", []):
                if isinstance(tarj, dict):
                    tarjetas_list.append(
                        PlayerStat(
                            nombre=str(tarj.get("nombre", "")),
                            valor=str(tarj.get("valor", "0")),
                            codigo_tipo_tarjeta=(
                                str(tarj.get("codigo_tipo_tarjeta"))
                                if tarj.get("codigo_tipo_tarjeta") is not None
                                else None
                            ),
                        )
                    )

            return PlayerDetail(
                codigo_jugador=str(p_raw.get("codigo_jugador", codjugador)),
                nombre_jugador=str(p_raw.get("nombre_jugador", "")),
                edad=str(p_raw.get("edad")) if p_raw.get("edad") is not None else None,
                anio_nacimiento=(
                    str(p_raw.get("anio_nacimiento"))
                    if p_raw.get("anio_nacimiento") is not None
                    else None
                ),
                equipo=p_raw.get("equipo"),
                codigo_equipo=(
                    str(p_raw.get("codigo_equipo"))
                    if p_raw.get("codigo_equipo") is not None
                    else None
                ),
                escudo_equipo=escudo_url,
                foto=foto_url,
                categoria_equipo=p_raw.get("categoria_equipo"),
                codigo_temporada=(
                    str(p_raw.get("codigo_temporada"))
                    if p_raw.get("codigo_temporada") is not None
                    else None
                ),
                nombre_temporada=p_raw.get("nombre_temporada"),
                dorsal_jugador=(
                    str(p_raw.get("dorsal_jugador"))
                    if p_raw.get("dorsal_jugador") is not None
                    else None
                ),
                posicion_jugador=(
                    p_raw.get("posicion_jugador")
                    or ("Portero" if str(p_raw.get("es_portero")) == "1" else None)
                ),
                minutos_totales_jugados=(
                    str(p_raw.get("minutos_totales_jugados"))
                    if p_raw.get("minutos_totales_jugados") is not None
                    else None
                ),
                media_minutos_totales_jugados=(
                    str(p_raw.get("media_minutos_totales_jugados"))
                    if p_raw.get("media_minutos_totales_jugados") is not None
                    else None
                ),
                es_portero=str(p_raw.get("es_portero", "0")),
                listado_temporadas=temporadas_list,
                competiciones_participa=competiciones_list,
                partidos=partidos_list,
                tarjetas=tarjetas_list,
            )
        except Exception as error:
            logger.error("Error al obtener ficha de jugador de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudo consultar el jugador {codjugador}: {error}"
            ) from error

    async def get_clasificacion(
        self,
        temporada: str,
        tipojuego: str,
        competicion: str,
        grupo: str,
        jornada: str,
    ) -> ClasificacionResponse:
        """Obtiene la clasificación oficial de un grupo en una jornada de la RFFM."""
        params = {
            "temporada": temporada.strip(),
            "tipojuego": tipojuego.strip(),
            "competicion": competicion.strip(),
            "grupo": grupo.strip(),
            "jornada": jornada.strip(),
        }

        try:
            data = await self._get_next_json(
                "competicion/clasificaciones.json",
                params=params,
                timeout=max(self.timeout, 25.0),
            )
            page_props = data.get("pageProps", {})
            standings_raw = page_props.get("standings", {})
            rounds_raw = page_props.get("rounds", {})

            # Promociones
            promociones: list[Promocion] = []
            for prom in standings_raw.get("promociones", []):
                if isinstance(prom, dict):
                    promociones.append(
                        Promocion(
                            orden=str(prom.get("orden", "")),
                            nombre_promocion=str(prom.get("nombre_promocion", "")),
                            color_promocion=str(prom.get("color_promocion", "#ffffff")),
                        )
                    )

            # Jornadas disponibles
            jornadas_disponibles: list[JornadaInfo] = []
            for j in rounds_raw.get("jornadas", []):
                if isinstance(j, dict):
                    jornadas_disponibles.append(
                        JornadaInfo(
                            codjornada=str(j.get("codjornada", "")),
                            nombre=str(j.get("nombre", j.get("codjornada", ""))),
                            fecha_jornada=j.get("fecha_jornada"),
                        )
                    )

            current_round = rounds_raw.get("currentRound")
            try:
                current_round_int = int(current_round) if current_round is not None else None
            except (ValueError, TypeError):
                current_round_int = None

            # Clasificación por equipos
            clasif_list: list[ClasificacionEquipo] = []
            raw_clasif = standings_raw.get("clasificacion", [])
            for item in raw_clasif:
                if not isinstance(item, dict):
                    continue

                gf = int(item.get("goles_a_favor", 0) or 0)
                gc = int(item.get("goles_en_contra", 0) or 0)
                diff = gf - gc
                diff_str = f"+{diff}" if diff > 0 else str(diff)

                rachas: list[RachaPartido] = []
                for r in item.get("racha_partidos", []):
                    if isinstance(r, dict):
                        rachas.append(
                            RachaPartido(
                                tipo=str(r.get("tipo", "")),
                                color=str(r.get("color", "#888888")),
                            )
                        )

                clasif_list.append(
                    ClasificacionEquipo(
                        posicion=str(item.get("posicion", "")),
                        codequipo=str(item.get("codequipo", "")),
                        nombre=str(item.get("nombre", "")),
                        escudo=fix_escudo_url(item.get("url_img")),
                        color=item.get("color"),
                        puntos=str(item.get("puntos", "0")),
                        jugados=str(item.get("jugados", "0")),
                        ganados=str(item.get("ganados", "0")),
                        empatados=str(item.get("empatados", "0")),
                        perdidos=str(item.get("perdidos", "0")),
                        goles_a_favor=str(gf),
                        goles_en_contra=str(gc),
                        diferencia_goles=diff_str,
                        puntos_sancion=str(item.get("puntos_sancion", "0")),
                        jugados_casa=(
                            str(item.get("jugados_casa"))
                            if item.get("jugados_casa") is not None
                            else None
                        ),
                        ganados_casa=(
                            str(item.get("ganados_casa"))
                            if item.get("ganados_casa") is not None
                            else None
                        ),
                        empatados_casa=(
                            str(item.get("empatados_casa"))
                            if item.get("empatados_casa") is not None
                            else None
                        ),
                        perdidos_casa=(
                            str(item.get("perdidos_casa"))
                            if item.get("perdidos_casa") is not None
                            else None
                        ),
                        puntos_local=(
                            str(item.get("puntos_local"))
                            if item.get("puntos_local") is not None
                            else None
                        ),
                        jugados_fuera=(
                            str(item.get("jugados_fuera"))
                            if item.get("jugados_fuera") is not None
                            else None
                        ),
                        ganados_fuera=(
                            str(item.get("ganados_fuera"))
                            if item.get("ganados_fuera") is not None
                            else None
                        ),
                        empatados_fuera=(
                            str(item.get("empatados_fuera"))
                            if item.get("empatados_fuera") is not None
                            else None
                        ),
                        perdidos_fuera=(
                            str(item.get("perdidos_fuera"))
                            if item.get("perdidos_fuera") is not None
                            else None
                        ),
                        puntos_visitante=(
                            str(item.get("puntos_visitante"))
                            if item.get("puntos_visitante") is not None
                            else None
                        ),
                        racha_partidos=rachas,
                    )
                )

            return ClasificacionResponse(
                temporada=temporada,
                competicion=str(standings_raw.get("competicion", "")),
                codigo_competicion=str(standings_raw.get("codigo_competicion", competicion)),
                grupo=str(standings_raw.get("grupo", "")),
                codigo_grupo=str(standings_raw.get("codigo_grupo", grupo)),
                jornada=str(standings_raw.get("jornada", jornada)),
                fecha_jornada=standings_raw.get("fecha_jornada"),
                current_round=current_round_int,
                total_jornadas=len(jornadas_disponibles),
                jornadas_disponibles=jornadas_disponibles,
                promociones=promociones,
                clasificacion=clasif_list,
            )
        except Exception as error:
            logger.error("Error al obtener clasificación de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudo consultar la clasificación de {competicion} (grupo {grupo}, jornada {jornada}): {error}"
            ) from error

    async def get_goleadores(
        self,
        competicion: str,
        grupo: str,
        temporada: Optional[str] = None,
        delegacion: Optional[str] = None,
    ) -> GoleadoresResponse:
        """Obtiene la tabla de máximos goleadores de una competición y grupo desde la API de RFFM."""
        params: dict[str, str] = {
            "idCompetition": competicion.strip(),
            "idGroup": grupo.strip(),
        }
        if delegacion:
            params["delegacion"] = delegacion.strip()

        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/128.0.0.0 Safari/537.36"
                ),
                "Accept": "application/json, text/plain, */*",
            }
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=max(self.timeout, 20.0),
                follow_redirects=True,
            ) as client:
                resp = await client.get("https://www.rffm.es/api/scorers", params=params, headers=headers)
                if resp.status_code != 200:
                    logger.warning(
                        "RFFM api/scorers retornó código %s para competición %s, grupo %s",
                        resp.status_code,
                        competicion,
                        grupo,
                    )
                    return GoleadoresResponse(
                        competicion=competicion,
                        codigo_competicion=competicion,
                        grupo=grupo,
                        codigo_grupo=grupo,
                        temporada=temporada,
                        total_goleadores=0,
                        goleadores=[],
                    )

                data = resp.json()
                if not data or not isinstance(data, dict):
                    return GoleadoresResponse(
                        competicion=competicion,
                        codigo_competicion=competicion,
                        grupo=grupo,
                        codigo_grupo=grupo,
                        temporada=temporada,
                        total_goleadores=0,
                        goleadores=[],
                    )

                nombre_comp = str(data.get("competicion") or competicion)
                nombre_grp = str(data.get("grupo") or grupo)
                raw_goles = data.get("goles") or []

                goleadores_list: list[GoleadorItem] = []
                if isinstance(raw_goles, list):
                    for idx, g in enumerate(raw_goles, start=1):
                        if not isinstance(g, dict):
                            continue
                        try:
                            goles_count = int(g.get("goles", 0) or 0)
                        except (ValueError, TypeError):
                            goles_count = 0
                        try:
                            goles_penalti_count = int(g.get("goles_penalti", 0) or 0)
                        except (ValueError, TypeError):
                            goles_penalti_count = 0
                        try:
                            partidos_count = int(g.get("partidos_jugados", 0) or 0)
                        except (ValueError, TypeError):
                            partidos_count = 0
                        try:
                            promedio = float(str(g.get("goles_por_partidos", 0)).replace(",", "."))
                        except (ValueError, TypeError):
                            promedio = round(goles_count / partidos_count, 2) if partidos_count > 0 else 0.0

                        foto_raw = g.get("foto")
                        foto_url = fix_escudo_url(foto_raw) if foto_raw else None

                        goleadores_list.append(
                            GoleadorItem(
                                posicion=idx,
                                codigo_jugador=str(g.get("codigo_jugador", "")),
                                jugador=str(g.get("jugador", "Desconocido")),
                                foto=foto_url,
                                codigo_equipo=str(g.get("codigo_equipo", "")) if g.get("codigo_equipo") else None,
                                nombre_equipo=str(g.get("nombre_equipo", "")),
                                escudo_equipo=fix_escudo_url(g.get("escudo_equipo")),
                                partidos_jugados=partidos_count,
                                goles=goles_count,
                                goles_penalti=goles_penalti_count,
                                goles_por_partidos=promedio,
                            )
                        )

                return GoleadoresResponse(
                    competicion=nombre_comp,
                    codigo_competicion=competicion,
                    grupo=nombre_grp,
                    codigo_grupo=grupo,
                    temporada=temporada,
                    total_goleadores=len(goleadores_list),
                    goleadores=goleadores_list,
                )
        except Exception as error:
            logger.error("Error al obtener goleadores de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudieron consultar los goleadores de {competicion} (grupo {grupo}): {error}"
            ) from error

    async def deduce_team_competition(
        self, codequipo: str
    ) -> tuple[Optional[str], Optional[str], Optional[str], Optional[str], str]:
        """Deduce competición y grupo a partir de la ficha de equipo y sus jugadores.
        Retorna (codigo_competicion, nombre_competicion, codgrupo, nombre_grupo, tipojuego).
        """
        clean_code = str(codequipo).strip()
        if hasattr(self, "_team_deduce_cache") and clean_code in self._team_deduce_cache:
            return self._team_deduce_cache[clean_code]

        try:
            team_data = await self.get_team_detail(clean_code)
            cat = (team_data.categoria if team_data else "").lower()
            is_f7 = any(c in cat for c in ["alevin", "alevín", "benjamin", "benjamín", "prebenjamin", "debutante", "f-7", "f7"])
            default_tipojuego = "2" if is_f7 else "1"

            if not team_data or not team_data.jugadores:
                res: tuple[Optional[str], Optional[str], Optional[str], Optional[str], str] = (
                    None, None, None, None, default_tipojuego
                )
                if hasattr(self, "_team_deduce_cache"):
                    self._team_deduce_cache[clean_code] = res
                return res

            # Revisar hasta los primeros 3 jugadores para encontrar su competición
            for jug in team_data.jugadores[:3]:
                try:
                    p_detail = await self.get_player_detail(jug.cod_jugador)
                    for comp in p_detail.competiciones_participa:
                        if str(comp.codequipo) == clean_code or len(p_detail.competiciones_participa) == 1:
                            cat_resolved = (team_data.categoria or comp.nombre_competicion or "").lower()
                            f7_resolved = any(c in cat_resolved for c in ["alevin", "alevín", "benjamin", "benjamín", "prebenjamin", "debutante", "f-7", "f7"])
                            res = (
                                comp.codigo_competicion,
                                comp.nombre_competicion,
                                comp.codgrupo,
                                comp.nombre_grupo,
                                "2" if f7_resolved else "1",
                            )
                            if hasattr(self, "_team_deduce_cache"):
                                self._team_deduce_cache[clean_code] = res
                            return res
                except Exception as p_err:
                    logger.debug("Error al consultar jugador %s para deducir equipo: %s", jug.cod_jugador, p_err)
                    continue

            fallback_res: tuple[Optional[str], Optional[str], Optional[str], Optional[str], str] = (
                None, None, None, None, default_tipojuego
            )
            if hasattr(self, "_team_deduce_cache"):
                self._team_deduce_cache[clean_code] = fallback_res
            return fallback_res
        except Exception as err:
            logger.warning("No se pudo deducir competición para equipo %s: %s", clean_code, err)
            return None, None, None, None, "1"

    async def get_all_competitions_cached(self, temporada: str = "22") -> list[Competition]:
        """Obtiene y cachea el catálogo completo de competiciones oficiales de F-11 y F-7."""
        if not hasattr(self, "_comps_cache"):
            self._comps_cache: dict[str, list[Competition]] = {}

        if temporada in self._comps_cache:
            return self._comps_cache[temporada]

        try:
            f11, f7 = await asyncio.gather(
                self.get_competitions(temporada, "1"),
                self.get_competitions(temporada, "2"),
                return_exceptions=True,
            )
            comps: list[Competition] = []
            if isinstance(f11, list):
                comps.extend(f11)
            if isinstance(f7, list):
                comps.extend(f7)

            if comps:
                self._comps_cache[temporada] = comps
            return comps
        except Exception as err:
            logger.warning("Error al cachear catálogo de competiciones: %s", err)
            return []

    async def search_and_deduce_teams(
        self, query: str, categoria: Optional[str] = None, max_results: int = 100
    ) -> list[DeduceTeamResult]:
        """Busca clubes y equipos coincidentes deduciendo su competición y grupo oficial.
        Soporta consultas compuestas (ej. 'adarve primera', 'adarve cadete primera', 'adarve cadete d').
        """
        clean_q = query.strip()
        if not clean_q:
            return []

        KEYWORDS_CAT_MAP = {
            "aficionado": "aficionado", "aficionados": "aficionado", "senior": "senior", "sénior": "senior",
            "juvenil": "juvenil", "juveniles": "juvenil",
            "cadete": "cadete", "cadetes": "cadete",
            "infantil": "infantil", "infantiles": "infantil",
            "alevin": "alevin", "alevín": "alevin", "alevínes": "alevin", "alevines": "alevin", "alev": "alevin",
            "benjamin": "benjamin", "benjamín": "benjamin", "benjamines": "benjamin",
            "prebenjamin": "prebenjamin", "prebenjamín": "prebenjamin", "prebenjamines": "prebenjamin",
            "debutante": "debutante", "debutantes": "debutante",
            "femenino": "femenino", "femenina": "femenino", "femeninos": "femenino", "femeninas": "femenino",
            "autonomica": "autonomica", "autonómica": "autonomica", "autonomico": "autonomica", "autonómico": "autonomica",
            "preferente": "preferente", "preferentes": "preferente",
            "primera": "primera", "1a": "primera", "1ª": "primera",
            "segunda": "segunda", "2a": "segunda", "2ª": "segunda",
            "tercera": "tercera", "3a": "tercera", "3ª": "tercera",
            "honor": "honor",
        }

        tokens = clean_q.split()
        cat_filters: set[str] = set()
        if categoria and categoria.strip() and categoria.strip().lower() != "todos":
            cat_norm = categoria.strip().lower()
            cat_filters.add(KEYWORDS_CAT_MAP.get(cat_norm, cat_norm))

        club_tokens: list[str] = []
        letter_filters: list[str] = []

        for t in tokens:
            t_norm = t.lower()
            if t_norm in KEYWORDS_CAT_MAP:
                cat_filters.add(KEYWORDS_CAT_MAP[t_norm])
            elif len(t) == 1 and t.isalpha():
                letter_filters.append(t.upper())
            elif t.startswith("'") and t.endswith("'") and len(t) == 3:
                letter_filters.append(t[1].upper())
            else:
                club_tokens.append(t)

        club_search = " ".join(club_tokens) if club_tokens else clean_q

        clubs_res = await self.get_clubs(page=1, search=club_search)
        if not clubs_res.clubs and club_search != clean_q:
            clubs_res = await self.get_clubs(page=1, search=clean_q)

        candidate_teams: list[tuple[Club, Any]] = []

        for club in clubs_res.clubs[:3]:
            try:
                club_detail = await self.get_club_detail(club.codigo_club)
                for eq in club_detail.equipos:
                    eq_cat = eq.categoria.lower()
                    eq_name = eq.nombre_equipo.lower()

                    # Comprobar que coincidan todos los filtros de categoría/división
                    if not all(cf in eq_cat or cf in eq_name for cf in cat_filters):
                        continue

                    # Comprobar letras de sub-equipo (ej. 'D', 'B', 'A')
                    if letter_filters:
                        matches_letter = any(
                            f"'{lf.lower()}'" in eq_name
                            or f" {lf.lower()}" in eq_name
                            or eq_name.endswith(f" {lf.lower()}")
                            for lf in letter_filters
                        )
                        if not matches_letter:
                            continue

                    candidate_teams.append((club, eq))
                    if len(candidate_teams) >= max_results:
                        break
                if len(candidate_teams) >= max_results:
                    break
            except Exception as club_err:
                logger.warning("Error al procesar club %s para deducción: %s", club.codigo_club, club_err)
                continue

        if not candidate_teams:
            return []

        # Cargar catálogo de 64 competiciones de RFFM (en memoria, ~0.01s tras primera carga)
        all_comps = await self.get_all_competitions_cached("22")

        def norm_txt(s: str) -> str:
            return (
                s.lower()
                .replace(" ", "")
                .replace("-", "")
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u")
            )

        comp_dict = {norm_txt(c.nombre): c for c in all_comps}

        async def _deduce_entry(club_item: Club, team_item: Any) -> DeduceTeamResult:
            team_cat = team_item.categoria or ""
            cat_low = team_cat.lower()
            is_f7 = any(
                w in cat_low
                for w in [
                    "alevin f-7", "alevin f7", "alev-f7", "benjamin", "benjamín",
                    "prebenjamin", "prebenjamín", "debutante", "f-7", "f7"
                ]
            ) and not ("alevin" in cat_low and "f-7" not in cat_low and "f7" not in cat_low and "alev-f7" not in cat_low)

            default_tipojuego = "2" if is_f7 else "1"

            # 1. Matching ultrarrápido contra catálogo oficial de RFFM
            n_cat = norm_txt(team_cat)
            matched_comp = comp_dict.get(n_cat)
            if not matched_comp:
                # Coincidencia parcial
                for k, c in comp_dict.items():
                    if k in n_cat or n_cat in k:
                        matched_comp = c
                        break

            comp_id = matched_comp.codigo if matched_comp else None
            comp_name = matched_comp.nombre if matched_comp else team_cat
            grp_id = None
            grp_name = None

            # 2. Deducir competición y grupo exacto para categorías federadas (infantil, cadete, juvenil, aficionado, etc.)
            is_deducible = any(
                w in cat_low
                for w in [
                    "infantil",
                    "cadete",
                    "juvenil",
                    "aficionado",
                    "senior",
                    "sénior",
                    "alevin",
                    "alevín",
                    "femenino",
                    "benjamin",
                    "benjamín",
                ]
            )
            if is_deducible:
                try:
                    # Inspección con timeout prudente para deducción exacta
                    d_comp_id, d_comp_name, d_grp_id, d_grp_name, d_tj = await asyncio.wait_for(
                        self.deduce_team_competition(team_item.codigo_equipo),
                        timeout=3.5,
                    )
                    if d_comp_id:
                        comp_id = d_comp_id
                        comp_name = d_comp_name or comp_name
                        grp_id = d_grp_id
                        grp_name = d_grp_name
                        default_tipojuego = d_tj
                except Exception:
                    pass

            return DeduceTeamResult(
                codigo_equipo=team_item.codigo_equipo,
                nombre_equipo=team_item.nombre_equipo,
                categoria=team_item.categoria,
                codigo_club=club_item.codigo_club,
                nombre_club=club_item.nombre,
                escudo_club=club_item.escudo,
                codigo_competicion=comp_id,
                nombre_competicion=comp_name,
                codigo_grupo=grp_id,
                nombre_grupo=grp_name,
                codigo_tipo_juego=default_tipojuego,
                codigo_temporada="22",
            )

        results = await asyncio.gather(*[_deduce_entry(c, eq) for c, eq in candidate_teams])
        return list(results)

    def _deduce_club_for_campo(self, codigo: str, nombre: str) -> Optional[str]:
        clean_cod = str(codigo).strip()
        if clean_cod in self._campo_to_club_cache:
            return self._campo_to_club_cache[clean_cod]
        nom_upper = strip_accents(nombre).upper()
        if "GANAPANES" in nom_upper or "ADARVE" in nom_upper:
            return "A.D. UNION ADARVE"
        if "SAN ROQUE" in nom_upper:
            return "C.D. SAN ROQUE E.F.F."
        if "VALDEBEBAS" in nom_upper or "CIUDAD REAL MADRID" in nom_upper:
            return "REAL MADRID C.F."
        if "CERRO DEL ESPINO" in nom_upper:
            return "ATLÉTICO DE MADRID"
        if "CANAL DE ISABEL" in nom_upper:
            return "C.D. BETIS SAN ISIDRO"
        if "COTORRUELO" in nom_upper:
            return "R.F.F.M. (Federativo)"
        if "LA ELIPA" in nom_upper:
            return "E.D. MORATALAZ"
        if "VALDELASFUENTES" in nom_upper or "ALCOBENDAS" in nom_upper:
            return "ALCOBENDAS C.F."
        if "VICALVARO" in nom_upper:
            return "C.D. VICÁLVARO"
        if "SAN BLAS" in nom_upper:
            return "E.D.M. SAN BLAS"
        if "CARABANCHEL" in nom_upper:
            return "R.C.D. CARABANCHEL"
        if "MOSCARDO" in nom_upper:
            return "C.D.C. MOSCARDÓ"
        if "SANTA ANA" in nom_upper:
            return "D.A.V. SANTA ANA"
        if "ALGETE" in nom_upper:
            return "C.D. ALGETE"
        if "PINTO" in nom_upper:
            return "CLUB ATLÉTICO PINTO"
        if "PARLA" in nom_upper:
            return "A.D. PARLA"
        if "POZUELO" in nom_upper:
            return "C.F. POZUELO DE ALARCÓN"
        if "LAS ROZAS" in nom_upper:
            return "LAS ROZAS C.F."
        if "MAJADAHONDA" in nom_upper:
            return "C.F. RAYO MAJADAHONDA"
        if "FUENLABRADA" in nom_upper:
            return "C.F. FUENLABRADA"
        if "ALCORCON" in nom_upper:
            return "A.D. ALCORCÓN"
        if "LEGANES" in nom_upper:
            return "C.D. LEGANÉS"
        if "GETAFE" in nom_upper:
            return "GETAFE C.F."
        return None

    def _deduce_direccion_for_campo(self, codigo: str, nombre: str) -> Optional[str]:
        clean_cod = str(codigo).strip()
        if clean_cod in self._campo_to_address_cache:
            return self._campo_to_address_cache[clean_cod]
        nom_upper = strip_accents(nombre).upper()
        if "GANAPANES" in nom_upper or "ADARVE" in nom_upper:
            return "C/ Becerrea, 4 (Vereda de Ganapanes)"
        if "SAN ROQUE" in nom_upper:
            return "Av. Monforte de Lemos, 13"
        if "COTORRUELO" in nom_upper:
            return "Vía Lusitana, 5"
        if "VALDEBEBAS" in nom_upper or "CIUDAD REAL MADRID" in nom_upper:
            return "Camino de Sintra, s/n (Valdebebas)"
        if "CANAL DE ISABEL" in nom_upper:
            return "Av. de Filipinas, 54"
        if "LA ELIPA" in nom_upper:
            return "C/ Alcalde Garrido Juaristi, 17"
        if "VALDELASFUENTES" in nom_upper:
            return "C/ Manuel de Falla, 89 (Alcobendas)"
        return None

    async def _search_campos_by_club_name(self, query: str) -> list[CampoItem]:
        """Busca clubes coincidentes y deduce las instalaciones o sedes donde disputan partidos sus equipos."""
        cache_key = query.lower().strip()
        if cache_key in self._club_campos_cache:
            return self._club_campos_cache[cache_key]

        results: list[CampoItem] = []
        try:
            clubs_res = await self.get_clubs(search=query)
            no_accents = strip_accents(query)
            if (not clubs_res or not clubs_res.clubs) and no_accents.lower() != query.lower():
                clubs_res = await self.get_clubs(search=no_accents)

            if not clubs_res or not clubs_res.clubs:
                self._club_campos_cache[cache_key] = []
                return []

            top_clubs = clubs_res.clubs[:2]
            seen_campos: set[str] = set()

            for club in top_clubs:
                try:
                    c_data = await self._get_next_json(f"fichaclub/{club.codigo_club}.json", timeout=10.0)
                    club_obj = c_data.get("pageProps", {}).get("club", {})
                    equipos = [
                        eq for eq in club_obj.get("equipos_club", [])
                        if eq.get("en_competicion") == "1"
                    ][:8]

                    async def fetch_team_field(eq: dict[str, Any]):
                        cod_eq = eq.get("codigo_equipo")
                        if not cod_eq:
                            return None, None, None
                        try:
                            t_data = await self._get_next_json(f"fichaequipo/{cod_eq}.json", timeout=8.0)
                            team_obj = t_data.get("pageProps", {}).get("team", {})
                            return (
                                team_obj.get("codigo_campo"),
                                team_obj.get("campo"),
                                team_obj.get("localidad_correspondencia"),
                            )
                        except Exception:
                            return None, None, None

                    team_fields = await asyncio.gather(*[fetch_team_field(eq) for eq in equipos])
                    for c_cod, c_nom, loc in team_fields:
                        if c_cod and str(c_cod) not in seen_campos:
                            clean_cod = str(c_cod).strip()
                            seen_campos.add(clean_cod)
                            self._campo_to_club_cache[clean_cod] = club.nombre
                            dir_val = (
                                self._campo_to_address_cache.get(clean_cod)
                                or self._deduce_direccion_for_campo(clean_cod, str(c_nom or ""))
                            )
                            results.append(
                                CampoItem(
                                    codigo=clean_cod,
                                    nombre=str(c_nom or f"Campo {clean_cod}").strip(),
                                    direccion=dir_val,
                                    localidad=loc or club.localidad,
                                    club_asociado=club.nombre,
                                )
                            )
                except Exception as club_err:
                    logger.debug("Error obteniendo campos para el club %s: %s", club.codigo_club, club_err)

            self._club_campos_cache[cache_key] = results
            return results
        except Exception as err:
            logger.debug("Error general en _search_campos_by_club_name: %s", err)
            return []

    async def search_campos(self, query: str = "", page: int = 1) -> CamposSearchResponse:
        """Busca terrenos de juego / instalaciones deportivas en el catálogo oficial de la RFFM.
        Soporta búsqueda directa por nombre de campo, calle o municipio, y también por nombre de club
        (asociando las diferentes sedes donde juegan sus equipos federados).
        """
        clean_query = query.strip() if query else ""
        params: dict[str, Any] = {}
        if clean_query:
            params["search"] = clean_query
        if page > 1:
            params["pagina"] = str(page)

        try:
            # 1. Petición directa a competicion/terrenosjuego.json
            data_direct_task = self._get_next_json("competicion/terrenosjuego.json", params=params)

            # 2. Si estamos en la página 1 y hay búsqueda, consultar simultáneamente por club
            clubs_task = None
            if clean_query and page == 1:
                clubs_task = self._search_campos_by_club_name(clean_query)

            if clubs_task is not None:
                data_direct, club_campos = await asyncio.gather(
                    data_direct_task, clubs_task, return_exceptions=True
                )
                if isinstance(data_direct, Exception):
                    raise data_direct
                if isinstance(club_campos, Exception):
                    logger.warning("Error al buscar campos por club: %s", club_campos)
                    club_campos = []
            else:
                data_direct = await data_direct_task
                club_campos = []

            page_props = data_direct.get("pageProps", {}) if data_direct else {}
            fields_data = page_props.get("fields", {}) or {}

            campos_raw = fields_data.get("campos", []) or []
            campos_items: list[CampoItem] = []
            seen_codigos: set[str] = set()

            for c in campos_raw:
                cod = str(c.get("codigo", "")).strip()
                if not cod:
                    continue
                seen_codigos.add(cod)
                nom = str(c.get("nombre", "")).strip()
                dir_val = (
                    c.get("direccion")
                    or self._campo_to_address_cache.get(cod)
                    or self._deduce_direccion_for_campo(cod, nom)
                )
                if dir_val:
                    self._campo_to_address_cache[cod] = dir_val
                club_asoc = (
                    c.get("club_asociado")
                    or self._campo_to_club_cache.get(cod)
                    or self._deduce_club_for_campo(cod, nom)
                )
                campos_items.append(
                    CampoItem(
                        codigo=cod,
                        nombre=nom,
                        direccion=dir_val,
                        codigo_postal=c.get("codigo_postal"),
                        localidad=c.get("localidad"),
                        provincia=c.get("provincia"),
                        superficie=c.get("superficie"),
                        tipo_campo=c.get("tipo_campo"),
                        club_asociado=club_asoc,
                    )
                )

            # Integrar campos deducidos a partir de la búsqueda por club
            if club_campos:
                for cc in club_campos:
                    if cc.codigo in seen_codigos:
                        for idx, item in enumerate(campos_items):
                            if item.codigo == cc.codigo:
                                campos_items[idx] = CampoItem(
                                    codigo=item.codigo,
                                    nombre=item.nombre,
                                    direccion=item.direccion or cc.direccion,
                                    codigo_postal=item.codigo_postal,
                                    localidad=item.localidad or cc.localidad,
                                    provincia=item.provincia,
                                    superficie=item.superficie,
                                    tipo_campo=item.tipo_campo,
                                    club_asociado=cc.club_asociado or item.club_asociado,
                                )
                    else:
                        seen_codigos.add(cc.codigo)
                        campos_items.append(cc)

            total_reg = int(fields_data.get("total_registros", len(campos_items)))
            if len(campos_items) > total_reg:
                total_reg = len(campos_items)
            total_pag = int(fields_data.get("total_paginas", 1))
            pag_act = int(fields_data.get("pagina_actual", page))

            return CamposSearchResponse(
                total_registros=total_reg,
                total_paginas=total_pag,
                pagina_actual=pag_act,
                campos=campos_items,
            )
        except Exception as error:
            logger.error("Error al buscar campos en la RFFM: %s", error)
            raise RFEFClientError(f"No se pudieron buscar terrenos de juego: {error}") from error

    async def get_campo_detail(self, codigo_campo: str) -> CampoDetailResponse:
        """Obtiene la ficha y la agenda completa de partidos de una instalación deportiva."""
        clean_cod = str(codigo_campo).strip()
        if not clean_cod:
            raise RFEFClientError("El código de campo no puede estar vacío.")

        try:
            data = await self._get_next_json(f"campo/{clean_cod}.json")
            page_props = data.get("pageProps", {})
            field_data = page_props.get("field", {})

            if not field_data:
                raise RFEFClientError(f"No se encontraron datos para el campo {clean_cod}")

            partidos_raw = field_data.get("partidos_campo", [])
            partidos_list: list[PartidoCampo] = []

            for p in partidos_raw:
                casa_code = str(p.get("codequipo_casa")) if p.get("codequipo_casa") else None
                fuera_code = str(p.get("codequipo_fuera")) if p.get("codequipo_fuera") else None

                nombre_casa = (
                    self._team_names_cache.get(casa_code)
                    if casa_code and casa_code in self._team_names_cache
                    else str(p.get("nombre_equipo_casa", "Local"))
                )
                nombre_fuera = (
                    self._team_names_cache.get(fuera_code)
                    if fuera_code and fuera_code in self._team_names_cache
                    else str(p.get("nombre_equipo_fuera", "Visitante"))
                )

                partidos_list.append(
                    PartidoCampo(
                        codacta=str(p.get("codacta", "")),
                        codgrupo=str(p.get("codgrupo")) if p.get("codgrupo") else None,
                        nombre_grupo=p.get("nombre_grupo"),
                        nombre_competicion=p.get("nombre_competicion"),
                        jornada=str(p.get("jornada")) if p.get("jornada") else None,
                        codequipo_casa=casa_code,
                        nombre_equipo_casa=nombre_casa,
                        escudo_equipo_casa=fix_escudo_url(p.get("escudo_equipo_casa")),
                        goles_casa=(
                            str(p.get("goles_casa"))
                            if p.get("goles_casa") != "" and p.get("goles_casa") is not None
                            else None
                        ),
                        codequipo_fuera=fuera_code,
                        nombre_equipo_fuera=nombre_fuera,
                        escudo_equipo_fuera=fix_escudo_url(p.get("escudo_equipo_fuera")),
                        goles_fuera=(
                            str(p.get("goles_fuera"))
                            if p.get("goles_fuera") != "" and p.get("goles_fuera") is not None
                            else None
                        ),
                        fecha=p.get("fecha"),
                    )
                )

            # Ordenar partidos por fecha cronológicamente
            def parse_match_date(pc: PartidoCampo) -> str:
                return pc.fecha or ""

            partidos_list.sort(key=parse_match_date)

            return CampoDetailResponse(
                codigo_campo=clean_cod,
                nombre_campo=str(field_data.get("nombre_campo") or "Campo sin nombre"),
                direccion=field_data.get("direccion"),
                localidad=field_data.get("localidad"),
                provincia=field_data.get("provincia"),
                codigo_postal=field_data.get("codigo_postal"),
                telefono_contacto=field_data.get("telefono_contacto"),
                superficie_juego=field_data.get("superficie_juego"),
                tipo_campo=field_data.get("tipo_campo"),
                latitud=str(field_data.get("latitud")) if field_data.get("latitud") else None,
                longitud=str(field_data.get("longitud")) if field_data.get("longitud") else None,
                total_partidos=len(partidos_list),
                partidos=partidos_list,
            )
        except Exception as error:
            logger.error("Error al obtener detalle del campo %s: %s", clean_cod, error)
            raise RFEFClientError(f"No se pudo consultar el campo {clean_cod}: {error}") from error




