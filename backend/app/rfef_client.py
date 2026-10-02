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
    ClubDetail,
    ClubEquipacion,
    ClubEquipo,
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
    PlayerCompeticion,
    PlayerDetail,
    PlayerStat,
    PlayerTemporada,
    Season,
    TeamDelegado,
    TeamDetail,
    TeamJugador,
    TeamTecnico,
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

RFFM_FICHA_CLUB_URL_TEMPLATE = os.getenv(
    "RFFM_FICHA_CLUB_URL_TEMPLATE",
    "https://www.rffm.es/_next/data/NY30BEAEFulRtBHCLvSa1/fichaclub/{codficha}.json",
)

RFFM_FICHA_EQUIPO_URL_TEMPLATE = os.getenv(
    "RFFM_FICHA_EQUIPO_URL_TEMPLATE",
    "https://www.rffm.es/_next/data/NY30BEAEFulRtBHCLvSa1/fichaequipo/{codficha}.json",
)

RFFM_FICHA_JUGADOR_URL_TEMPLATE = os.getenv(
    "RFFM_FICHA_JUGADOR_URL_TEMPLATE",
    "https://www.rffm.es/_next/data/NY30BEAEFulRtBHCLvSa1/fichajugador/{codjugador}.json",
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
        acta_url_template: str = RFFM_ACTA_URL_TEMPLATE,
        ficha_club_url_template: str = RFFM_FICHA_CLUB_URL_TEMPLATE,
        ficha_equipo_url_template: str = RFFM_FICHA_EQUIPO_URL_TEMPLATE,
        ficha_jugador_url_template: str = RFFM_FICHA_JUGADOR_URL_TEMPLATE,
        timeout_seconds: float = 12.0,
        verify_ssl: bool = False,
    ) -> None:
        self.calendario_url = calendario_url
        self.clubs_url = clubs_url
        self.acta_url_template = acta_url_template
        self.ficha_club_url_template = ficha_club_url_template
        self.ficha_equipo_url_template = ficha_equipo_url_template
        self.ficha_jugador_url_template = ficha_jugador_url_template
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
            timeout = max(self.timeout, 25.0)
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(self.clubs_url, params=params, headers=headers)
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

    async def get_club_detail(self, codficha: str) -> ClubDetail:
        """Obtiene la información detallada de un club y sus equipos federados."""
        url = self.ficha_club_url_template.format(codficha=codficha)
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
            timeout = max(self.timeout, 25.0)
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
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
                        equipos.append(
                            ClubEquipo(
                                codigo_equipo=str(eq.get("codigo_equipo", "")),
                                nombre_equipo=str(eq.get("nombre_equipo", "")),
                                categoria=str(eq.get("categoria", "")),
                                en_competicion=str(eq.get("en_competicion", "1")),
                            )
                        )

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
            timeout = max(self.timeout, 25.0)
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
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
        url = self.ficha_jugador_url_template.format(codjugador=codjugador)
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
            timeout = max(self.timeout, 25.0)
            async with httpx.AsyncClient(
                verify=self.verify_ssl,
                timeout=timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
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


