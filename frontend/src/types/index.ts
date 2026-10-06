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
  codigo_campo?: string | null;
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

export interface FavoriteCampo {
  codigoCampo: string;
  nombreCampo: string;
  localidad?: string | null;
  direccion?: string | null;
  clubAsociado?: string | null;
  superficie?: string | null;
  tipoCampo?: string | null;
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

export interface ClubEquipo {
  codigo_equipo: string;
  nombre_equipo: string;
  categoria: string;
  en_competicion?: string | null;
}

export interface ClubEquipacion {
  camiseta?: string | null;
  pantalon?: string | null;
  medias?: string | null;
}

export interface ClubDetail {
  codigo: string;
  nombre_club: string;
  escudo?: string | null;
  delegacion?: string | null;
  comarca?: string | null;
  cif?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigo_postal?: string | null;
  portal_web?: string | null;
  email?: string | null;
  telefonos?: string | null;
  presidente?: string | null;
  fecha_fundacion?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  equipaciones: ClubEquipacion[];
  equipos: ClubEquipo[];
}

export interface TeamJugador {
  cod_jugador: string;
  nombre: string;
}

export interface TeamTecnico {
  cod_tecnico: string;
  nombre: string;
}

export interface TeamDelegado {
  cod_delegado?: string | null;
  nombre: string;
}

export interface TeamDetail {
  codigo_equipo: string;
  codigo_club: string;
  nombre_equipo: string;
  nombre_club: string;
  escudo_club?: string | null;
  categoria: string;
  codigo_categoria?: string | null;
  campo?: string | null;
  codigo_campo?: string | null;
  portal_web?: string | null;
  email?: string | null;
  telefonos?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigo_postal?: string | null;
  tecnicos: TeamTecnico[];
  jugadores: TeamJugador[];
  delegados: TeamDelegado[];
  equipaciones: ClubEquipacion[];
}

export interface PlayerStat {
  nombre: string;
  valor: string;
  codigo_tipo_tarjeta?: string | null;
}

export interface PlayerTemporada {
  nombre_temporada: string;
  codigo_temporada: string;
}

export interface PlayerCompeticion {
  nombre_competicion: string;
  codigo_competicion: string;
  nombre_grupo?: string | null;
  codgrupo?: string | null;
  codequipo?: string | null;
  nombre_equipo?: string | null;
  nombre_club?: string | null;
  posicion_equipo?: string | null;
  puntos_equipo?: string | null;
  escudo_equipo?: string | null;
}

export interface PlayerDetail {
  codigo_jugador: string;
  nombre_jugador: string;
  edad?: string | null;
  anio_nacimiento?: string | null;
  equipo?: string | null;
  codigo_equipo?: string | null;
  escudo_equipo?: string | null;
  foto?: string | null;
  categoria_equipo?: string | null;
  codigo_temporada?: string | null;
  nombre_temporada?: string | null;
  dorsal_jugador?: string | null;
  posicion_jugador?: string | null;
  minutos_totales_jugados?: string | null;
  media_minutos_totales_jugados?: string | null;
  es_portero?: string | null;
  listado_temporadas: PlayerTemporada[];
  competiciones_participa: PlayerCompeticion[];
  partidos: PlayerStat[];
  tarjetas: PlayerStat[];
}

export interface BuildIdResponse {
  build_id: string;
}

export interface Promocion {
  orden: string;
  nombre_promocion: string;
  color_promocion: string;
}

export interface RachaPartido {
  tipo: string;
  color: string;
}

export interface ClasificacionEquipo {
  posicion: string;
  codequipo: string;
  nombre: string;
  escudo?: string | null;
  color?: string | null;
  puntos: string;
  jugados: string;
  ganados: string;
  empatados: string;
  perdidos: string;
  goles_a_favor: string;
  goles_en_contra: string;
  diferencia_goles: string;
  puntos_sancion?: string | null;
  jugados_casa?: string | null;
  ganados_casa?: string | null;
  empatados_casa?: string | null;
  perdidos_casa?: string | null;
  puntos_local?: string | null;
  jugados_fuera?: string | null;
  ganados_fuera?: string | null;
  empatados_fuera?: string | null;
  perdidos_fuera?: string | null;
  puntos_visitante?: string | null;
  racha_partidos: RachaPartido[];
}

export interface JornadaInfo {
  codjornada: string;
  nombre: string;
  fecha_jornada?: string | null;
}

export interface ClasificacionResponse {
  temporada: string;
  competicion: string;
  codigo_competicion: string;
  grupo: string;
  codigo_grupo: string;
  jornada: string;
  fecha_jornada?: string | null;
  current_round?: number | null;
  total_jornadas: number;
  jornadas_disponibles: JornadaInfo[];
  promociones: Promocion[];
  clasificacion: ClasificacionEquipo[];
}

export interface DeduceTeamResult {
  codigo_equipo: string;
  nombre_equipo: string;
  categoria: string;
  codigo_club: string;
  nombre_club: string;
  escudo_club?: string | null;
  codigo_competicion?: string | null;
  nombre_competicion?: string | null;
  codigo_grupo?: string | null;
  nombre_grupo?: string | null;
  codigo_tipo_juego?: string | null;
  codigo_temporada?: string | null;
}

export interface SearchTeamsResponse {
  total: number;
  teams: DeduceTeamResult[];
}

export interface CampoItem {
  codigo: string;
  nombre: string;
  direccion?: string | null;
  codigo_postal?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  superficie?: string | null;
  tipo_campo?: string | null;
  club_asociado?: string | null;
}

export interface CamposSearchResponse {
  total_registros: number;
  total_paginas: number;
  pagina_actual: number;
  campos: CampoItem[];
}

export interface PartidoCampo {
  codacta: string;
  codgrupo?: string | null;
  nombre_grupo?: string | null;
  nombre_competicion?: string | null;
  jornada?: string | null;
  codequipo_casa?: string | null;
  nombre_equipo_casa: string;
  escudo_equipo_casa?: string | null;
  goles_casa?: string | null;
  codequipo_fuera?: string | null;
  nombre_equipo_fuera: string;
  escudo_equipo_fuera?: string | null;
  goles_fuera?: string | null;
  fecha?: string | null;
}

export interface CampoDetailResponse {
  codigo_campo: string;
  nombre_campo: string;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigo_postal?: string | null;
  telefono_contacto?: string | null;
  superficie_juego?: string | null;
  tipo_campo?: string | null;
  latitud?: string | null;
  longitud?: string | null;
  total_partidos: number;
  partidos: PartidoCampo[];
}
