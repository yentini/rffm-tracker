"""FastAPI Application for RFEF Tracker."""

from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Path, Query, status
from fastapi.middleware.cors import CORSMiddleware

from app.rfef_client import RFEFClient, RFEFClientError
from app.schemas import (
    ActaResponse,
    CalendarioResponse,
    CampoDetailResponse,
    CamposSearchResponse,
    BuildIdResponse,
    ClasificacionResponse,
    ClubDetail,
    ClubsResponse,
    CompetitionsResponse,
    GameTypesResponse,
    GroupsResponse,
    HealthResponse,
    ListaPartidosResponse,
    PlayerDetail,
    SearchTeamsResponse,
    SeasonsResponse,
    TeamDetail,
)

rfef_client = RFEFClient()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación."""
    yield


app = FastAPI(
    title="RFEF / RFFM Tracker API",
    description="API REST intermedia para consulta y seguimiento de competiciones RFEF / RFFM",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS permisivo para llamadas fluidas desde PWA / frontend y entornos de prueba
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    tags=["Sistema"],
    summary="Verificación de estado de salud",
)
async def health_check() -> HealthResponse:
    """Endpoint de comprobación de salud para monitorización en Render."""
    return HealthResponse()


@app.get(
    "/api/rffm/build-id",
    response_model=BuildIdResponse,
    status_code=status.HTTP_200_OK,
    tags=["Sistema"],
    summary="Obtener buildId actual de Next.js en la RFFM",
)
async def get_rffm_build_id(
    force_refresh: bool = Query(
        default=False,
        description="Forzar recarga dinámica desde el portal oficial de la RFFM",
    ),
) -> BuildIdResponse:
    """Retorna el buildId vigente de Next.js para peticiones de datos federativos."""
    build_id = await rfef_client.get_build_id(force_refresh=force_refresh)
    return BuildIdResponse(build_id=build_id)


@app.get(
    "/api/seasons",
    response_model=SeasonsResponse,
    status_code=status.HTTP_200_OK,
    tags=["Competición"],
    summary="Listar temporadas disponibles",
)
async def get_seasons() -> SeasonsResponse:
    """Obtiene el listado oficial de temporadas (seasons) desde la RFFM."""
    try:
        seasons = await rfef_client.get_seasons()
        return SeasonsResponse(total=len(seasons), seasons=seasons)
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al sincronizar temporadas con RFFM: {exc}",
        ) from exc


@app.get(
    "/api/game-types",
    response_model=GameTypesResponse,
    status_code=status.HTTP_200_OK,
    tags=["Competición"],
    summary="Listar tipos de juego / modalidades",
)
async def get_game_types() -> GameTypesResponse:
    """Obtiene el listado oficial de modalidades de fútbol (Fútbol-11, Fútbol-7, etc.)."""
    try:
        game_types = await rfef_client.get_game_types()
        return GameTypesResponse(total=len(game_types), game_types=game_types)
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al sincronizar tipos de juego con RFFM: {exc}",
        ) from exc


@app.get(
    "/api/competitions",
    response_model=CompetitionsResponse,
    status_code=status.HTTP_200_OK,
    tags=["Competición"],
    summary="Listar competiciones por temporada y tipo de juego",
)
async def get_competitions(
    temporada: str = Query(..., description="Código identificador de la temporada (ej. 22)"),
    tipojuego: str = Query(..., description="Código del tipo de juego (ej. 1 para F-11, 2 para F-7)"),
) -> CompetitionsResponse:
    """Obtiene el listado de competiciones oficiales para una temporada y modalidad dadas."""
    try:
        competitions = await rfef_client.get_competitions(temporada=temporada, tipojuego=tipojuego)
        return CompetitionsResponse(
            total=len(competitions),
            temporada=temporada,
            tipojuego=tipojuego,
            competitions=competitions,
        )
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al obtener competiciones desde la RFFM: {exc}",
        ) from exc


@app.get(
    "/api/groups",
    response_model=GroupsResponse,
    status_code=status.HTTP_200_OK,
    tags=["Competición"],
    summary="Listar grupos de una competición",
)
async def get_groups(
    competicion: str = Query(..., description="Código identificador de la competición oficial (ej. 26737828)"),
) -> GroupsResponse:
    """Obtiene el listado oficial de grupos para una competición dada."""
    try:
        groups = await rfef_client.get_groups(competicion=competicion)
        return GroupsResponse(
            total=len(groups),
            competicion=competicion,
            groups=groups,
        )
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al obtener grupos desde la RFFM: {exc}",
        ) from exc


@app.get(
    "/api/calendario",
    response_model=CalendarioResponse,
    status_code=status.HTTP_200_OK,
    tags=["Competición"],
    summary="Listar calendario y partidos por jornada",
)
async def get_calendario(
    temporada: str = Query(..., description="Código de temporada (ej. 22)"),
    tipojuego: str = Query(..., description="Código de modalidad de fútbol (ej. 1)"),
    competicion: str = Query(..., description="Código de la competición (ej. 26737751)"),
    grupo: str = Query(..., description="Código del grupo (ej. 26737755)"),
) -> CalendarioResponse:
    """Obtiene el calendario oficial completo agrupado por jornadas (rounds) con la jornada actual."""
    try:
        calendario = await rfef_client.get_calendario(
            temporada=temporada,
            tipojuego=tipojuego,
            competicion=competicion,
            grupo=grupo,
        )
        return calendario
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al obtener calendario desde la RFFM: {exc}",
        ) from exc


@app.get(
    "/api/clasificacion",
    response_model=ClasificacionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Competición"],
    summary="Obtener clasificación oficial por grupo y jornada",
)
async def get_clasificacion(
    temporada: str = Query(..., description="Código de temporada (ej. 22)"),
    tipojuego: str = Query(..., description="Código de modalidad de fútbol (ej. 1)"),
    competicion: str = Query(..., description="Código de la competición (ej. 26737751)"),
    grupo: str = Query(..., description="Código del grupo (ej. 26737755)"),
    jornada: str = Query(..., description="Número de jornada (ej. 1, 2)"),
) -> ClasificacionResponse:
    """Obtiene la clasificación oficial completa de un grupo en una jornada específica."""
    try:
        return await rfef_client.get_clasificacion(
            temporada=temporada,
            tipojuego=tipojuego,
            competicion=competicion,
            grupo=grupo,
            jornada=jornada,
        )
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al obtener clasificación desde la RFFM: {exc}",
        ) from exc


@app.get(
    "/api/acta-partido",
    response_model=ActaResponse,
    status_code=status.HTTP_200_OK,
    tags=["Partidos"],
    summary="Detalle completo de acta del partido",
)
async def get_acta_partido(
    codacta: str = Query(..., description="Código del acta (ej. 5601649)"),
    temporada: Optional[str] = Query(None, description="Código opcional de temporada (ej. 22)"),
    competicion: Optional[str] = Query(None, description="Código opcional de competición"),
    grupo: Optional[str] = Query(None, description="Código opcional de grupo"),
) -> ActaResponse:
    """Obtiene el acta oficial completa de un partido con alineaciones, goles y tarjetas."""
    try:
        acta = await rfef_client.get_acta_partido(
            codacta=codacta,
            temporada=temporada,
            competicion=competicion,
            grupo=grupo,
        )
        return ActaResponse(codacta=codacta, game=acta)
    except RFEFClientError as exc:
        err_msg = str(exc)
        if "No se encontraron datos de acta" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El acta arbitral aún no ha sido publicada o validada por el estamento arbitral en la RFFM.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al consultar el acta del partido {codacta} desde RFFM: {exc}",
        ) from exc



@app.get(
    "/api/partidos",
    response_model=ListaPartidosResponse,
    status_code=status.HTTP_200_OK,
    tags=["Partidos"],
    summary="Listar partidos de la jornada",
)
async def get_partidos(
    competicion_id: Optional[str] = Query(None, description="Identificador de la competición"),
    jornada: Optional[int] = Query(None, ge=1, description="Número de jornada"),
) -> ListaPartidosResponse:
    """Obtiene el listado de partidos programados o en curso."""
    partidos = await rfef_client.get_partidos_jornada(competicion_id=competicion_id, jornada=jornada)
    return ListaPartidosResponse(total=len(partidos), partidos=partidos)


@app.get(
    "/api/clubs",
    response_model=ClubsResponse,
    status_code=status.HTTP_200_OK,
    tags=["Clubes"],
    summary="Listar y buscar clubes federados con paginación",
)
async def get_clubs(
    p: int = Query(default=1, ge=1, description="Número de página a consultar"),
    search: Optional[str] = Query(default=None, description="Término de búsqueda por nombre de club"),
    codclub: Optional[str] = Query(default=None, description="Filtrar por código de club específico"),
) -> ClubsResponse:
    """Obtiene o busca clubes oficiales en la RFFM con paginación y filtro de texto."""
    try:
        return await rfef_client.get_clubs(page=p, search=search, codclub=codclub)
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al sincronizar clubes con RFFM: {exc}",
        ) from exc


@app.get(
    "/api/clubs/{codficha}",
    response_model=ClubDetail,
    status_code=status.HTTP_200_OK,
    tags=["Clubes"],
    summary="Obtener ficha detallada de un club y sus equipos federados",
)
async def get_club_detail(
    codficha: str = Path(..., description="Código identificador del club en la RFFM"),
) -> ClubDetail:
    """Obtiene la información oficial del club (datos generales, contacto) y su lista de equipos."""
    try:
        return await rfef_client.get_club_detail(codficha=codficha)
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al consultar ficha de club en RFFM: {exc}",
        ) from exc


@app.get(
    "/api/teams/search",
    response_model=SearchTeamsResponse,
    status_code=status.HTTP_200_OK,
    tags=["Equipos"],
    summary="Búsqueda asistida de equipos deduciendo competición y grupo",
)
async def search_teams(
    query: str = Query(..., min_length=2, description="Nombre del equipo o club (ej. Pozuelo, Adarve Cadete)"),
    categoria: Optional[str] = Query(None, description="Filtro opcional de categoría (ej. cadete, infantil)"),
) -> SearchTeamsResponse:
    """Busca equipos y deduce automáticamente su competición oficial y grupo en la RFFM."""
    try:
        teams = await rfef_client.search_and_deduce_teams(query=query, categoria=categoria)
        return SearchTeamsResponse(total=len(teams), teams=teams)
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error en la búsqueda y deducción de equipos: {exc}",
        ) from exc


@app.get(
    "/api/teams/{codficha}",
    response_model=TeamDetail,
    status_code=status.HTTP_200_OK,
    tags=["Equipos"],
    summary="Obtener ficha detallada de un equipo, cuerpo técnico y plantilla",
)
async def get_team_detail(
    codficha: str = Path(..., description="Código identificador del equipo en la RFFM"),
) -> TeamDetail:
    """Obtiene la información oficial del equipo, su terreno de juego, técnicos y plantilla de jugadores."""
    try:
        return await rfef_client.get_team_detail(codficha=codficha)
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al consultar ficha de equipo en RFFM: {exc}",
        ) from exc


@app.get(
    "/api/players/{codjugador}",
    response_model=PlayerDetail,
    status_code=status.HTTP_200_OK,
    tags=["Jugadores"],
    summary="Obtener ficha detallada de un jugador, estadísticas y temporadas",
)
async def get_player_detail(
    codjugador: str = Path(..., description="Código identificador del jugador en la RFFM"),
    temporada: Optional[str] = Query(None, description="Código de temporada para histórico"),
) -> PlayerDetail:
    """Obtiene la información oficial del jugador, estadísticas de partidos, tarjetas y temporadas."""
    try:
        return await rfef_client.get_player_detail(codjugador=codjugador, temporada=temporada)
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al consultar ficha de jugador en RFFM: {exc}",
        ) from exc


@app.get(
    "/api/campos/search",
    response_model=CamposSearchResponse,
    status_code=status.HTTP_200_OK,
    tags=["Instalaciones"],
    summary="Buscar instalaciones y terrenos de juego de la RFFM",
)
async def search_campos(
    query: Optional[str] = Query(default="", description="Término de búsqueda (nombre, calle o localidad)"),
    page: int = Query(default=1, ge=1, description="Número de página"),
) -> CamposSearchResponse:
    """Busca campos de fútbol e instalaciones deportivas en el catálogo oficial de la RFFM."""
    try:
        return await rfef_client.search_campos(query=query or "", page=page)
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al buscar instalaciones en la RFFM: {exc}",
        ) from exc


@app.get(
    "/api/campos/{codigo_campo}",
    response_model=CampoDetailResponse,
    status_code=status.HTTP_200_OK,
    tags=["Instalaciones"],
    summary="Obtener ficha y agenda completa de partidos de una sede deportiva",
)
async def get_campo_detail(
    codigo_campo: str = Path(..., description="Código identificador del terreno de juego en la RFFM"),
) -> CampoDetailResponse:
    """Obtiene la información oficial del campo y el listado de partidos programados con sus horarios."""
    try:
        return await rfef_client.get_campo_detail(codigo_campo=codigo_campo)
    except RFEFClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al consultar instalación en la RFFM: {exc}",
        ) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
