"""HTTP Client for RFEF / RFFM integration with async httpx."""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional
import httpx

from app.schemas import (
    ActaPartido,
    CalendarioResponse,
    Club,
    ClubsPagination,
    ClubsResponse,
    Competition,
    EstadoPartido,
    Equipo,
    GameType,
    Group,
    Jornada,
    Partido,
    PartidoCalendario,
    Season,
)

logger = logging.getLogger(__name__)

RFFM_CALENDARIO_URL = os.getenv(
    "RFFM_CALENDARIO_URL",
    "https://www.rffm.es/_next/data/NY30BEAEFulRtBHCLvSa1/competicion/calendario.json",
)

RFFM_CLUBS_URL = os.getenv(
    "RFFM_CLUBS_URL",
    "https://www.rffm.es/_next/data/NY30BEAEFulRtBHCLvSa1/competicion/clubes.json",
)

RFFM_COMPETITIONS_URL = os.getenv(
    "RFFM_COMPETITIONS_URL",
    "https://www.rffm.es/api/competitions",
)

RFFM_GROUPS_URL = os.getenv(
    "RFFM_GROUPS_URL",
    "https://www.rffm.es/api/groups",
)

RFFM_ACTA_URL_TEMPLATE = os.getenv(
    "RFFM_ACTA_URL_TEMPLATE",
    "https://www.rffm.es/_next/data/NY30BEAEFulRtBHCLvSa1/acta-partido/{codacta}.json",
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



class RFEFClientError(Exception):
    """Excepción base para errores en el cliente RFEF / RFFM."""


class RFEFClient:
    """Cliente HTTP asíncrono para interactuar con endpoints de la RFFM / RFEF."""

    def __init__(
        self,
        calendario_url: str = RFFM_CALENDARIO_URL,
        clubs_url: str = RFFM_CLUBS_URL,
        timeout_seconds: float = 12.0,
        verify_ssl: bool = False,
    ) -> None:
        self.calendario_url = calendario_url
        self.clubs_url = clubs_url
        self.timeout = timeout_seconds
        # Por defecto verify_ssl=False permite trabajar bajo proxies o certificados intermedios
        self.verify_ssl = verify_ssl
        self._cached_page_props: Optional[dict[str, Any]] = None

    async def get_calendario_page_props(self, force_refresh: bool = False) -> dict[str, Any]:
        """Obtiene las propiedades de la página (pageProps) de la RFFM."""
        if self._cached_page_props and not force_refresh:
            return self._cached_page_props

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=self.timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(self.calendario_url, headers=headers)
                response.raise_for_status()
                data = response.json()
                page_props = data.get("pageProps", {})
                self._cached_page_props = page_props
                return page_props
        except Exception as error:
            logger.error("Error al obtener datos de la RFFM: %s", error)
            # Si falla la red remota y tenemos caché, la reutilizamos
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
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=self.timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(
                    self.calendario_url,
                    params=params,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()
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
                                fecha=eq.get("fecha"),
                                hora=eq.get("hora"),
                            )
                        )

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
        temporada: str,
        competicion: str,
        grupo: str,
        codacta: str,
    ) -> ActaPartido:
        """Obtiene el acta y los detalles completos de un partido desde la RFFM."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }
        url = RFFM_ACTA_URL_TEMPLATE.format(codacta=codacta)
        params = {
            "temporada": temporada,
            "competicion": competicion,
            "grupo": grupo,
            "codacta": codacta,
        }

        try:
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=self.timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
                page_props = data.get("pageProps", {})
                game_data = page_props.get("game", {})

                if not game_data:
                    raise RFEFClientError(f"No se encontraron datos de acta para el partido {codacta}")

                game_dict = dict(game_data)
                game_dict["escudo_local"] = fix_escudo_url(game_dict.get("escudo_local"))
                game_dict["escudo_visitante"] = fix_escudo_url(game_dict.get("escudo_visitante"))

                return ActaPartido.model_validate(game_dict)
        except Exception as error:
            logger.error("Error al obtener acta de la RFFM: %s", error)
            raise RFEFClientError(
                f"No se pudo consultar el acta {codacta}: {error}"
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

    async def get_clubs(self, page: int = 1) -> ClubsResponse:
        """Obtiene el listado oficial y paginado de clubes de la RFFM."""
        url = f"{self.clubs_url}?p={page}"
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=self.timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                page_props = data.get("pageProps", {})
                clubs_raw = page_props.get("clubs", {})

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

