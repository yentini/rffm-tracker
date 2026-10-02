export type EstadoPartido =
  | 'NO_INICIADO'
  | 'EN_JUEGO'
  | 'DESCANSO'
  | 'FINALIZADO'
  | 'APLAZADO';

export interface Season {
  cod_temporada: string;
  nombre: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

export interface GameType {
  codigo_tipo_juego: string;
  nombre: string;
}

export interface SeasonsResponse {
  total: number;
  seasons: Season[];
}

export interface GameTypesResponse {
  total: number;
  game_types: GameType[];
}

export interface Competition {
  codigo: string;
  nombre: string;
  tipo_competicion?: string | null;
  codigo_tipo_juego?: string | null;
  tipo_juego?: string | null;
  codigo_categoria?: string | null;
  nombre_categoria?: string | null;
  cod_grupo_categoria?: string | null;
  nombre_grupo_categoria?: string | null;
  activa?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

export interface CompetitionsResponse {
  total: number;
  temporada: string;
  tipojuego: string;
  competitions: Competition[];
}

export interface Group {
  codigo: string;
  nombre: string;
  total_jornadas?: string | null;
  total_equipos?: string | null;
  orden?: string | null;
  nombre_delegacion?: string | null;
}

export interface GroupsResponse {
  total: number;
  competicion: string;
  groups: Group[];
}

export interface EquipoGrupo {
  codigo: string;
  nombre: string;
  escudo?: string | null;
}

export interface PartidoCalendario {
  codacta: string;
  codigo_equipo_local?: string | null;
  equipo_local: string;
  escudo_equipo_local?: string | null;
  goles_local?: string | null;
  codigo_equipo_visitante?: string | null;
  equipo_visitante: string;
  escudo_equipo_visitante?: string | null;
  goles_visitante?: string | null;
  campo?: string | null;
  fecha?: string | null;
  hora?: string | null;
}

export interface Jornada {
  codjornada: string;
  nombre_jornada: string;
  numero_jornada: number;
  partidos: PartidoCalendario[];
}

export interface CalendarioResponse {
  temporada: string;
  tipojuego: string;
  competicion: string;
  grupo: string;
  current_round: number;
  total_jornadas: number;
  rounds: Jornada[];
}

export interface Equipo {
  id: string;
  nombre: string;
  escudo_url?: string | null;
  abreviatura?: string | null;
}

export interface Partido {
  id: string;
  competicion: string;
  jornada: number;
  fecha: string;
  estado: EstadoPartido;
  minuto?: number | null;
  local: Equipo;
  visitante: Equipo;
  goles_local?: number | null;
  goles_visitante?: number | null;
}

export interface ListaPartidosResponse {
  total: number;
  partidos: Partido[];
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export interface GolActa {
  minuto?: string | null;
  nombre_jugador?: string | null;
  tipo_gol?: string | null;
  codjugador?: string | null;
}

export interface TarjetaActa {
  minuto?: string | null;
  nombre_jugador?: string | null;
  codigo_tipo_amonestacion?: string | null;
  segunda_amarilla?: string | null;
  codjugador?: string | null;
}

export interface JugadorActa {
  codjugador?: string | null;
  dorsal?: string | null;
  nombre_jugador?: string | null;
  titular?: string | null;
  suplente?: string | null;
  capitan?: string | null;
  portero?: string | null;
  posicion?: string | null;
  posicion_jugador_abreviatura?: string | null;
  foto?: string | null;
}

export interface ArbitroActa {
  cod_arbitro?: string | null;
  tipo_arbitro?: string | null;
  nombre_arbitro?: string | null;
}

export interface ActaPartido {
  codacta: string;
  nombre_competicion?: string | null;
  nombre_grupo?: string | null;
  jornada?: string | null;
  fecha?: string | null;
  hora?: string | null;
  campo?: string | null;
  codigo_campo?: string | null;
  estado?: string | null;
  acta_cerrada?: string | null;
  partido_en_juego?: string | null;
  equipo_local?: string | null;
  escudo_local?: string | null;
  goles_local?: string | null;
  codigo_equipo_local?: string | null;
  equipo_visitante?: string | null;
  escudo_visitante?: string | null;
  goles_visitante?: string | null;
  codigo_equipo_visitante?: string | null;
  entrenador_local?: string | null;
  entrenador_visitante?: string | null;
  delegadolocal?: string | null;
  delegado_visitante?: string | null;
  goles_equipo_local?: GolActa[];
  goles_equipo_visitante?: GolActa[];
  tarjetas_equipo_local?: TarjetaActa[];
  tarjetas_equipo_visitante?: TarjetaActa[];
  jugadores_equipo_local?: JugadorActa[];
  jugadores_equipo_visitante?: JugadorActa[];
  arbitros_partido?: ArbitroActa[];
}

export interface ActaResponse {
  codacta: string;
  game: ActaPartido;
}

export interface FavoriteTeam {
  teamId: string;
  teamName: string;
  teamShield?: string | null;
  seasonId: string;
  seasonName: string;
  gameTypeId: string;
  gameTypeName: string;
  competitionId: string;
  competitionName: string;
  groupId: string;
  groupName: string;
  savedAt: number;
}

export interface Club {
  codigo_club: string;
  nombre: string;
  clave_acceso?: string | null;
  escudo?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  total_equipos?: string | null;
}

export interface ClubsPagination {
  pagina_actual: number;
  total_paginas: number;
  total_registros: number;
  pagina_anterior?: number | null;
  pagina_siguiente?: number | null;
}

export interface ClubsResponse {
  pagination: ClubsPagination;
  clubs: Club[];
}


