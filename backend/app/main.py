"""FastAPI Application for RFEF Tracker."""

from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from app.rfef_client import RFEFClient, RFEFClientError
from app.schemas import (
    ActaResponse,
    CalendarioResponse,
    CompetitionsResponse,
    GameTypesResponse,
    GroupsResponse,
    HealthResponse,
    ListaPartidosResponse,
    SeasonsResponse,
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
    "/api/acta-partido",
    response_model=ActaResponse,
    status_code=status.HTTP_200_OK,
    tags=["Partidos"],
    summary="Detalle completo de acta del partido",
)
async def get_acta_partido(
    temporada: str = Query(..., description="Código de temporada (ej. 22)"),
    competicion: str = Query(..., description="Código de competición (ej. 26737751)"),
    grupo: str = Query(..., description="Código de grupo (ej. 26737755)"),
    codacta: str = Query(..., description="Código del acta (ej. 5601649)"),
) -> ActaResponse:
    """Obtiene el acta oficial completa de un partido con alineaciones, goles y tarjetas."""
    try:
        acta = await rfef_client.get_acta_partido(
            temporada=temporada,
            competicion=competicion,
            grupo=grupo,
            codacta=codacta,
        )
        return ActaResponse(codacta=codacta, game=acta)
    except RFEFClientError as exc:
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
