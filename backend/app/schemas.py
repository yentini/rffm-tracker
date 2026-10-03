"""Data schemas for RFEF Tracker API."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    """Health check status model."""
    model_config = ConfigDict(frozen=True)

    status: str = Field(default="ok", description="Estado del servicio")
    service: str = Field(default="rfef-tracker-backend", description="Nombre del servicio")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Marca temporal UTC",
    )


class Season(BaseModel):
    """Modelo para representar una temporada de la RFFM."""
    model_config = ConfigDict(frozen=True)

    cod_temporada: str = Field(..., description="Código identificador de la temporada")
    nombre: str = Field(..., description="Nombre de la temporada (ej. 2026-2027)")
    fecha_inicio: Optional[str] = Field(default=None, description="Fecha de inicio (YYYY-MM-DD)")
    fecha_fin: Optional[str] = Field(default=None, description="Fecha de fin (YYYY-MM-DD)")


class GameType(BaseModel):
    """Modelo para representar una modalidad o tipo de fútbol en la RFFM."""
    model_config = ConfigDict(frozen=True)

    codigo_tipo_juego: str = Field(..., description="Código identificador de la modalidad")
    nombre: str = Field(..., description="Nombre de la modalidad (ej. Fútbol-11, Fútbol-7)")


class SeasonsResponse(BaseModel):
    """Respuesta con el listado de temporadas."""
    model_config = ConfigDict(frozen=True)

    total: int = Field(..., description="Total de temporadas disponibles")
    seasons: list[Season] = Field(default_factory=list, description="Listado de temporadas")


class GameTypesResponse(BaseModel):
    """Respuesta con el listado de tipos de juego."""
    model_config = ConfigDict(frozen=True)

    total: int = Field(..., description="Total de tipos de juego disponibles")
    game_types: list[GameType] = Field(default_factory=list, description="Listado de tipos de fútbol")


class Competition(BaseModel):
    """Modelo para representar una competición oficial de la RFFM."""
    model_config = ConfigDict(frozen=True)

    codigo: str = Field(..., description="Código identificador único de la competición")
    nombre: str = Field(..., description="Nombre oficial de la competición")
    tipo_competicion: Optional[str] = Field(default=None, description="Tipo o nivel de competición")
    codigo_tipo_juego: Optional[str] = Field(default=None, description="Código de modalidad de fútbol")
    tipo_juego: Optional[str] = Field(default=None, description="Nombre de modalidad")
    codigo_categoria: Optional[str] = Field(default=None, description="Código de categoría")
    nombre_categoria: Optional[str] = Field(default=None, description="Nombre de categoría (ej. Alevín)")
    cod_grupo_categoria: Optional[str] = Field(default=None, description="Código de grupo de categoría")
    nombre_grupo_categoria: Optional[str] = Field(default=None, description="Nombre de grupo de categoría")
    activa: Optional[str] = Field(default=None, description="Indicador si está activa")
    fecha_inicio: Optional[str] = Field(default=None, description="Fecha de inicio (YYYY-MM-DD)")
    fecha_fin: Optional[str] = Field(default=None, description="Fecha de fin (YYYY-MM-DD)")


class CompetitionsResponse(BaseModel):
    """Respuesta con el listado de competiciones encontradas."""
    model_config = ConfigDict(frozen=True)

    total: int = Field(..., description="Total de competiciones encontradas")
    temporada: str = Field(..., description="Código de la temporada consultada")
    tipojuego: str = Field(..., description="Código de modalidad consultada")
    competitions: list[Competition] = Field(default_factory=list, description="Listado de competiciones")


class Group(BaseModel):
    """Modelo para representar un grupo dentro de una competición de la RFFM."""
    model_config = ConfigDict(frozen=True)

    codigo: str = Field(..., description="Código identificador único del grupo")
    nombre: str = Field(..., description="Nombre del grupo (ej. Grupo 1)")
    total_jornadas: Optional[str] = Field(default=None, description="Número total de jornadas")
    total_equipos: Optional[str] = Field(default=None, description="Número de equipos participantes")
    orden: Optional[str] = Field(default=None, description="Orden de clasificación o visualización")
    nombre_delegacion: Optional[str] = Field(default=None, description="Delegación correspondiente")


class GroupsResponse(BaseModel):
    """Respuesta con el listado de grupos de una competición."""
    model_config = ConfigDict(frozen=True)

    total: int = Field(..., description="Total de grupos encontrados")
    competicion: str = Field(..., description="Código de la competición consultada")
    groups: list[Group] = Field(default_factory=list, description="Listado de grupos")


class PartidoCalendario(BaseModel):
    """Representación de un partido del calendario oficial."""
    model_config = ConfigDict(frozen=True)

    codacta: str = Field(..., description="Código del acta del partido")
    codigo_equipo_local: Optional[str] = Field(default=None, description="Código del club local")
    equipo_local: str = Field(..., description="Nombre del equipo local")
    escudo_equipo_local: Optional[str] = Field(default=None, description="URL absoluta del escudo local")
    goles_local: Optional[str] = Field(default=None, description="Goles marcados por el equipo local")
    codigo_equipo_visitante: Optional[str] = Field(default=None, description="Código del club visitante")
    equipo_visitante: str = Field(..., description="Nombre del equipo visitante")
    escudo_equipo_visitante: Optional[str] = Field(default=None, description="URL absoluta del escudo visitante")
    goles_visitante: Optional[str] = Field(default=None, description="Goles marcados por el equipo visitante")
    campo: Optional[str] = Field(default=None, description="Instalación o campo donde se disputa")
    fecha: Optional[str] = Field(default=None, description="Fecha programada (DD-MM-YYYY)")
    hora: Optional[str] = Field(default=None, description="Hora programada (HH:MM)")


class Jornada(BaseModel):
    """Jornada del calendario con sus partidos asociados."""
    model_config = ConfigDict(frozen=True)

    codjornada: str = Field(..., description="Código identificador de la jornada")
    nombre_jornada: str = Field(..., description="Texto descriptivo de la jornada (ej. 1 (26-09-2026))")
    numero_jornada: int = Field(..., description="Número ordinal de la jornada")
    partidos: list[PartidoCalendario] = Field(default_factory=list, description="Partidos de la jornada")


class EquipoGrupo(BaseModel):
    """Representación de un equipo participante en el grupo."""
    model_config = ConfigDict(frozen=True)

    codigo: str = Field(..., description="Código identificador del club o equipo")
    nombre: str = Field(..., description="Nombre completo del equipo")
    escudo: Optional[str] = Field(default=None, description="URL absoluta del escudo")


class CalendarioResponse(BaseModel):
    """Respuesta completa del calendario con todas las jornadas y la jornada activa."""
    model_config = ConfigDict(frozen=True)

    temporada: str = Field(..., description="Código de temporada")
    tipojuego: str = Field(..., description="Código de modalidad")
    competicion: str = Field(..., description="Código de competición")
    grupo: str = Field(..., description="Código de grupo")
    current_round: int = Field(default=1, description="Número de jornada actual en curso")
    total_jornadas: int = Field(..., description="Número total de jornadas del grupo")
    equipos: list[EquipoGrupo] = Field(default_factory=list, description="Equipos participantes del grupo")
    rounds: list[Jornada] = Field(default_factory=list, description="Listado de jornadas con sus encuentros")


class EstadoPartido(str, Enum):
    """Estado operativo de un partido."""
    NO_INICIADO = "NO_INICIADO"
    EN_JUEGO = "EN_JUEGO"
    DESCANSO = "DESCANSO"
    FINALIZADO = "FINALIZADO"
    APLAZADO = "APLAZADO"


class Equipo(BaseModel):
    """Representación de un equipo de fútbol."""
    model_config = ConfigDict(frozen=True)

    id: str = Field(..., description="Identificador único del equipo")
    nombre: str = Field(..., description="Nombre completo del club")
    escudo_url: Optional[str] = Field(default=None, description="URL del logo o escudo")
    abreviatura: Optional[str] = Field(default=None, description="Código corto o abreviatura")


class Partido(BaseModel):
    """Representación de un partido de fútbol."""
    model_config = ConfigDict(frozen=True)

    id: str = Field(..., description="Identificador único del partido")
    competicion: str = Field(..., description="Nombre de la competición o categoría")
    jornada: int = Field(..., description="Número de jornada")
    fecha: datetime = Field(..., description="Fecha y hora programada del encuentro")
    estado: EstadoPartido = Field(default=EstadoPartido.NO_INICIADO, description="Estado del partido")
    minuto: Optional[int] = Field(default=None, description="Minuto en curso si está en juego")
    local: Equipo = Field(..., description="Equipo local")
    visitante: Equipo = Field(..., description="Equipo visitante")
    goles_local: Optional[int] = Field(default=None, description="Goles marcados por el equipo local")
    goles_visitante: Optional[int] = Field(default=None, description="Goles marcados por el equipo visitante")


class ListaPartidosResponse(BaseModel):
    """Respuesta paginada o listado de partidos."""
    model_config = ConfigDict(frozen=True)

    total: int = Field(..., description="Total de partidos encontrados")
    partidos: list[Partido] = Field(default_factory=list, description="Listado de partidos")


class GolActa(BaseModel):
    """Información de un gol en el acta del partido."""
    model_config = ConfigDict(frozen=True, extra="allow")

    minuto: Optional[str] = Field(default=None, description="Minuto del gol")
    nombre_jugador: Optional[str] = Field(default=None, description="Nombre del goleador")
    tipo_gol: Optional[str] = Field(default=None, description="Tipo o código de gol")
    codjugador: Optional[str] = Field(default=None, description="Código del jugador")


class TarjetaActa(BaseModel):
    """Información de una amonestación en el acta."""
    model_config = ConfigDict(frozen=True, extra="allow")

    minuto: Optional[str] = Field(default=None, description="Minuto de la amonestación")
    nombre_jugador: Optional[str] = Field(default=None, description="Nombre del jugador amonestado")
    codigo_tipo_amonestacion: Optional[str] = Field(default=None, description="Código de amonestación (100: Amarilla, 200: Roja)")
    segunda_amarilla: Optional[str] = Field(default=None, description="Indicador si es segunda amarilla")
    codjugador: Optional[str] = Field(default=None, description="Código del jugador")


class JugadorActa(BaseModel):
    """Información de un jugador en la alineación del acta."""
    model_config = ConfigDict(frozen=True, extra="allow")

    codjugador: Optional[str] = Field(default=None, description="Código del jugador")
    dorsal: Optional[str] = Field(default=None, description="Número de dorsal")
    nombre_jugador: Optional[str] = Field(default=None, description="Nombre completo")
    titular: Optional[str] = Field(default="0", description="1 si es titular, 0 si no")
    suplente: Optional[str] = Field(default="0", description="1 si es suplente, 0 si no")
    capitan: Optional[str] = Field(default="0", description="1 si es capitán")
    portero: Optional[str] = Field(default="0", description="1 si es portero")
    posicion: Optional[str] = Field(default=None, description="Descripción de la posición")
    posicion_jugador_abreviatura: Optional[str] = Field(default=None, description="Abreviatura de la posición")
    foto: Optional[str] = Field(default=None, description="Foto del jugador si está disponible")


class ArbitroActa(BaseModel):
    """Información de un árbitro designado."""
    model_config = ConfigDict(frozen=True, extra="allow")

    cod_arbitro: Optional[str] = Field(default=None, description="Código del árbitro")
    tipo_arbitro: Optional[str] = Field(default=None, description="Rol (ej. ARBITRO, ASISTENTE)")
    nombre_arbitro: Optional[str] = Field(default=None, description="Nombre completo")


class ActaPartido(BaseModel):
    """Detalle completo del acta de un partido desde RFFM."""
    model_config = ConfigDict(frozen=True, extra="allow")

    codacta: str = Field(..., description="Código identificador del acta")
    nombre_competicion: Optional[str] = Field(default=None, description="Nombre de la competición")
    nombre_grupo: Optional[str] = Field(default=None, description="Nombre del grupo")
    jornada: Optional[str] = Field(default=None, description="Número o texto de jornada")
    fecha: Optional[str] = Field(default=None, description="Fecha del partido")
    hora: Optional[str] = Field(default=None, description="Hora de inicio")
    campo: Optional[str] = Field(default=None, description="Instalación deportiva")
    codigo_campo: Optional[str] = Field(default=None, description="Código de instalación")
    estado: Optional[str] = Field(default=None, description="Estado del partido")
    acta_cerrada: Optional[str] = Field(default="0", description="Indicador si el acta está cerrada")
    partido_en_juego: Optional[str] = Field(default="0", description="Indicador si está en juego")
    equipo_local: Optional[str] = Field(default=None, description="Nombre del equipo local")
    escudo_local: Optional[str] = Field(default=None, description="URL del escudo local")
    goles_local: Optional[str] = Field(default=None, description="Goles del equipo local")
    codigo_equipo_local: Optional[str] = Field(default=None, description="Código del equipo local")
    equipo_visitante: Optional[str] = Field(default=None, description="Nombre del equipo visitante")
    escudo_visitante: Optional[str] = Field(default=None, description="URL del escudo visitante")
    goles_visitante: Optional[str] = Field(default=None, description="Goles del equipo visitante")
    codigo_equipo_visitante: Optional[str] = Field(default=None, description="Código del equipo visitante")
    entrenador_local: Optional[str] = Field(default=None, description="Entrenador local")
    entrenador_visitante: Optional[str] = Field(default=None, description="Entrenador visitante")
    delegadolocal: Optional[str] = Field(default=None, description="Delegado local")
    delegado_visitante: Optional[str] = Field(default=None, description="Delegado visitante")
    goles_equipo_local: list[GolActa] = Field(default_factory=list, description="Goles locales")
    goles_equipo_visitante: list[GolActa] = Field(default_factory=list, description="Goles visitantes")
    tarjetas_equipo_local: list[TarjetaActa] = Field(default_factory=list, description="Tarjetas locales")
    tarjetas_equipo_visitante: list[TarjetaActa] = Field(default_factory=list, description="Tarjetas visitantes")
    jugadores_equipo_local: list[JugadorActa] = Field(default_factory=list, description="Plantilla local")
    jugadores_equipo_visitante: list[JugadorActa] = Field(default_factory=list, description="Plantilla visitante")
    arbitros_partido: list[ArbitroActa] = Field(default_factory=list, description="Equipo arbitral")


class ActaResponse(BaseModel):
    """Respuesta que contiene los datos del acta del partido."""
    model_config = ConfigDict(frozen=True)

    codacta: str = Field(..., description="Código del acta consultada")
    game: ActaPartido = Field(..., description="Detalles del partido extraídos de pageProps.game")


class Club(BaseModel):
    """Modelo para representar un club federado de la RFFM."""
    model_config = ConfigDict(frozen=True)

    codigo_club: str = Field(..., description="Código identificador del club")
    nombre: str = Field(..., description="Nombre oficial del club")
    clave_acceso: Optional[str] = Field(default=None, description="Clave de acceso")
    escudo: Optional[str] = Field(default=None, description="URL normalizada del escudo")
    localidad: Optional[str] = Field(default=None, description="Localidad del club")
    provincia: Optional[str] = Field(default=None, description="Provincia")
    total_equipos: Optional[str] = Field(default=None, description="Número total de equipos federados")


class ClubsPagination(BaseModel):
    """Metadatos de paginación del listado de clubes."""
    model_config = ConfigDict(frozen=True)

    pagina_actual: int = Field(..., description="Página actual")
    total_paginas: int = Field(..., description="Total de páginas disponibles")
    total_registros: int = Field(..., description="Total de clubes registrados")
    pagina_anterior: Optional[int] = Field(default=None, description="Página anterior")
    pagina_siguiente: Optional[int] = Field(default=None, description="Página siguiente")


class ClubsResponse(BaseModel):
    """Respuesta paginada de clubes de la RFFM."""
    model_config = ConfigDict(frozen=True)

    pagination: ClubsPagination = Field(..., description="Información de paginación")
    clubs: list[Club] = Field(default_factory=list, description="Listado de clubes de la página")


class ClubEquipo(BaseModel):
    """Modelo para representar un equipo perteneciente a un club federado."""
    model_config = ConfigDict(frozen=True)

    codigo_equipo: str = Field(..., description="Código identificador del equipo")
    nombre_equipo: str = Field(..., description="Nombre del equipo")
    categoria: str = Field(..., description="Categoría en la que compite")
    en_competicion: Optional[str] = Field(default="1", description="Estado de competición (1 o 0)")


class ClubEquipacion(BaseModel):
    """Modelo para representar los colores de la equipación del club."""
    model_config = ConfigDict(frozen=True)

    camiseta: Optional[str] = Field(default=None, description="Color de la camiseta")
    pantalon: Optional[str] = Field(default=None, description="Color del pantalón")
    medias: Optional[str] = Field(default=None, description="Color de las medias")


class ClubDetail(BaseModel):
    """Modelo con la información detallada de un club y sus equipos."""
    model_config = ConfigDict(frozen=True)

    codigo: str = Field(..., description="Código identificador del club")
    nombre_club: str = Field(..., description="Nombre oficial del club")
    escudo: Optional[str] = Field(default=None, description="URL completa del escudo")
    delegacion: Optional[str] = Field(default=None, description="Delegación a la que pertenece")
    comarca: Optional[str] = Field(default=None, description="Comarca")
    cif: Optional[str] = Field(default=None, description="CIF fiscal del club")
    domicilio: Optional[str] = Field(default=None, description="Dirección del club")
    localidad: Optional[str] = Field(default=None, description="Localidad")
    provincia: Optional[str] = Field(default=None, description="Provincia")
    codigo_postal: Optional[str] = Field(default=None, description="Código postal")
    portal_web: Optional[str] = Field(default=None, description="Sitio web oficial")
    email: Optional[str] = Field(default=None, description="Correo electrónico oficial")
    telefonos: Optional[str] = Field(default=None, description="Teléfonos de contacto")
    presidente: Optional[str] = Field(default=None, description="Nombre del presidente")
    fecha_fundacion: Optional[str] = Field(default=None, description="Fecha de fundación")
    twitter: Optional[str] = Field(default=None, description="Cuenta o usuario de Twitter/X")
    instagram: Optional[str] = Field(default=None, description="Cuenta o usuario de Instagram")
    facebook: Optional[str] = Field(default=None, description="Cuenta o usuario de Facebook")
    equipaciones: list[ClubEquipacion] = Field(default_factory=list, description="Colores de equipaciones")
    equipos: list[ClubEquipo] = Field(default_factory=list, description="Listado de equipos del club")


class TeamJugador(BaseModel):
    """Modelo para representar a un jugador federado en la plantilla del equipo."""
    model_config = ConfigDict(frozen=True)

    cod_jugador: str = Field(..., description="Código de ficha del jugador")
    nombre: str = Field(..., description="Nombre completo del jugador")


class TeamTecnico(BaseModel):
    """Modelo para representar a un técnico del cuerpo técnico."""
    model_config = ConfigDict(frozen=True)

    cod_tecnico: str = Field(..., description="Código del técnico")
    nombre: str = Field(..., description="Nombre del técnico o entrenador")


class TeamDelegado(BaseModel):
    """Modelo para representar a un delegado o auxiliar del equipo."""
    model_config = ConfigDict(frozen=True)

    cod_delegado: Optional[str] = Field(default=None, description="Código del delegado")
    nombre: str = Field(..., description="Nombre del delegado o auxiliar")


class TeamDetail(BaseModel):
    """Modelo con la información completa de la ficha de un equipo federado."""
    model_config = ConfigDict(frozen=True)

    codigo_equipo: str = Field(..., description="Código identificador del equipo")
    codigo_club: str = Field(..., description="Código del club al que pertenece")
    nombre_equipo: str = Field(..., description="Nombre del equipo")
    nombre_club: str = Field(..., description="Nombre del club")
    escudo_club: Optional[str] = Field(default=None, description="URL del escudo del club")
    categoria: str = Field(..., description="Categoría oficial en la que compite")
    codigo_categoria: Optional[str] = Field(default=None, description="Código de la categoría")
    campo: Optional[str] = Field(default=None, description="Nombre del terreno de juego")
    codigo_campo: Optional[str] = Field(default=None, description="Código del terreno de juego")
    portal_web: Optional[str] = Field(default=None, description="Página web")
    email: Optional[str] = Field(default=None, description="Correo electrónico de contacto")
    telefonos: Optional[str] = Field(default=None, description="Teléfonos de contacto")
    domicilio: Optional[str] = Field(default=None, description="Dirección")
    localidad: Optional[str] = Field(default=None, description="Localidad")
    provincia: Optional[str] = Field(default=None, description="Provincia")
    codigo_postal: Optional[str] = Field(default=None, description="Código postal")
    tecnicos: list[TeamTecnico] = Field(default_factory=list, description="Cuerpo técnico")
    jugadores: list[TeamJugador] = Field(default_factory=list, description="Plantilla de jugadores")
    delegados: list[TeamDelegado] = Field(default_factory=list, description="Delegados y auxiliares")
    equipaciones: list[ClubEquipacion] = Field(default_factory=list, description="Colores de equipaciones")


class PlayerStat(BaseModel):
    """Estadística de partidos o tarjetas del jugador."""
    model_config = ConfigDict(frozen=True)

    nombre: str = Field(..., description="Nombre del concepto estadístico")
    valor: str = Field(..., description="Valor numérico o media")
    codigo_tipo_tarjeta: Optional[str] = Field(default=None, description="Código de tarjeta si aplica")


class PlayerTemporada(BaseModel):
    """Temporada registrada del jugador."""
    model_config = ConfigDict(frozen=True)

    nombre_temporada: str = Field(..., description="Nombre de la temporada (ej. 2026-2027)")
    codigo_temporada: str = Field(..., description="Código de temporada")


class PlayerCompeticion(BaseModel):
    """Competición en la que participa el jugador con su equipo."""
    model_config = ConfigDict(frozen=True)

    nombre_competicion: str = Field(..., description="Nombre de la competición")
    codigo_competicion: str = Field(..., description="Código de la competición")
    nombre_grupo: Optional[str] = Field(default=None, description="Nombre del grupo")
    codgrupo: Optional[str] = Field(default=None, description="Código del grupo")
    codequipo: Optional[str] = Field(default=None, description="Código del equipo")
    nombre_equipo: Optional[str] = Field(default=None, description="Nombre del equipo")
    nombre_club: Optional[str] = Field(default=None, description="Nombre del club")
    posicion_equipo: Optional[str] = Field(default=None, description="Posición en la clasificación")
    puntos_equipo: Optional[str] = Field(default=None, description="Puntos del equipo")
    escudo_equipo: Optional[str] = Field(default=None, description="URL del escudo del equipo")


class PlayerDetail(BaseModel):
    """Modelo con la información oficial completa de la ficha de un jugador."""
    model_config = ConfigDict(frozen=True)

    codigo_jugador: str = Field(..., description="Código identificador del jugador")
    nombre_jugador: str = Field(..., description="Nombre y apellidos del jugador")
    edad: Optional[str] = Field(default=None, description="Edad")
    anio_nacimiento: Optional[str] = Field(default=None, description="Año de nacimiento")
    equipo: Optional[str] = Field(default=None, description="Nombre del equipo")
    codigo_equipo: Optional[str] = Field(default=None, description="Código del equipo")
    escudo_equipo: Optional[str] = Field(default=None, description="URL del escudo del equipo o club")
    foto: Optional[str] = Field(default=None, description="Foto del jugador")
    categoria_equipo: Optional[str] = Field(default=None, description="Categoría en la que compite")
    codigo_temporada: Optional[str] = Field(default=None, description="Código de la temporada actual")
    nombre_temporada: Optional[str] = Field(default=None, description="Nombre de la temporada actual")
    dorsal_jugador: Optional[str] = Field(default=None, description="Número de dorsal")
    posicion_jugador: Optional[str] = Field(default=None, description="Demarcación o posición")
    minutos_totales_jugados: Optional[str] = Field(default=None, description="Total de minutos jugados")
    media_minutos_totales_jugados: Optional[str] = Field(default=None, description="Media de minutos por partido")
    es_portero: Optional[str] = Field(default="0", description="Indicador si es guardameta")
    listado_temporadas: list[PlayerTemporada] = Field(default_factory=list, description="Temporadas en RFFM")
    competiciones_participa: list[PlayerCompeticion] = Field(default_factory=list, description="Competiciones activas")
    partidos: list[PlayerStat] = Field(default_factory=list, description="Estadísticas de partidos")
    tarjetas: list[PlayerStat] = Field(default_factory=list, description="Estadísticas disciplinarias")


class BuildIdResponse(BaseModel):
    """Modelo para representar el buildId vigente de Next.js en la RFFM."""
    model_config = ConfigDict(frozen=True)

    build_id: str = Field(..., description="Identificador buildId de Next.js vigente")



