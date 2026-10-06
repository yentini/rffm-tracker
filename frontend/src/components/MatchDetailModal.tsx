import React, { useState, useMemo } from 'react';
import { ActaPartido, PartidoCalendario, PlayerDetail } from '../types';
import { fetchPlayerDetail } from '../services/api';
import { PlayerDetailModal } from './PlayerDetailModal';
import {
  getGoogleMapsUrl,
  getGoogleCalendarUrl,
  downloadIcsFile,
} from '../utils/matchActions';
import { computeRunningScores } from '../utils/timeline';
import {
  X,
  Shield,
  MapPin,
  Calendar,
  Clock,
  User,
  Loader2,
  ExternalLink,
  ChevronRight,
  Navigation,
  CalendarPlus,
  Download,
} from 'lucide-react';

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  partido: PartidoCalendario | null;
  acta: ActaPartido | null;
  isLoading: boolean;
  error?: string | null;
}

const getEscudoUrl = (url?: string | null): string | null => {
  if (!url || !url.trim()) return null;
  const clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return clean.startsWith('/')
    ? `https://appweb.rffm.es${clean}`
    : `https://appweb.rffm.es/${clean}`;
};

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  isOpen,
  onClose,
  partido,
  acta,
  isLoading,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'incidencias' | 'alineaciones' | 'info'>('incidencias');
  const [teamTab, setTeamTab] = useState<'local' | 'visitante'>('local');

  // Estado para la ficha del jugador seleccionado
  const [selectedPlayerCode, setSelectedPlayerCode] = useState<string | null>(null);
  const [playerDetail, setPlayerDetail] = useState<PlayerDetail | null>(null);
  const [isPlayerDetailLoading, setIsPlayerDetailLoading] = useState<boolean>(false);
  const [playerDetailError, setPlayerDetailError] = useState<string | null>(null);

  const handleOpenPlayer = async (codjugador?: string | null) => {
    if (!codjugador) return;
    setSelectedPlayerCode(codjugador);
    setPlayerDetail(null);
    setPlayerDetailError(null);
    setIsPlayerDetailLoading(true);

    try {
      const pData = await fetchPlayerDetail(codjugador);
      setPlayerDetail(pData);
    } catch (err: any) {
      setPlayerDetailError(err.message || 'Error al obtener la ficha del jugador');
    } finally {
      setIsPlayerDetailLoading(false);
    }
  };

  const handleClosePlayer = () => {
    setSelectedPlayerCode(null);
    setPlayerDetail(null);
    setPlayerDetailError(null);
  };

  const safePartido = partido || ({} as Partial<PartidoCalendario>);
  const data = acta || ({} as Partial<ActaPartido>);
  const equipoLocal = data.equipo_local || safePartido.equipo_local || '';
  const equipoVisitante = data.equipo_visitante || safePartido.equipo_visitante || '';
  const escudoLocal = getEscudoUrl(data.escudo_local || safePartido.escudo_equipo_local);
  const escudoVisitante = getEscudoUrl(data.escudo_visitante || safePartido.escudo_equipo_visitante);
  const golesLocal = data.goles_local ?? safePartido.goles_local;
  const golesVisitante = data.goles_visitante ?? safePartido.goles_visitante;
  const hasScore = golesLocal !== null && golesLocal !== undefined && golesVisitante !== null && golesVisitante !== undefined;

  const golesLocalList = data.goles_equipo_local || [];
  const golesVisitanteList = data.goles_equipo_visitante || [];
  const tarjetasLocalList = data.tarjetas_equipo_local || [];
  const tarjetasVisitanteList = data.tarjetas_equipo_visitante || [];

  const jugadoresLocal = data.jugadores_equipo_local || [];
  const jugadoresVisitante = data.jugadores_equipo_visitante || [];

  const titularesLocal = jugadoresLocal.filter((j) => j.titular === '1');
  const suplentesLocal = jugadoresLocal.filter((j) => j.suplente === '1' || j.titular === '0');

  const titularesVisitante = jugadoresVisitante.filter((j) => j.titular === '1');
  const suplentesVisitante = jugadoresVisitante.filter((j) => j.suplente === '1' || j.titular === '0');
  const arbitros = data.arbitros_partido || [];

  const campo = data.campo || safePartido.campo;

  // Resolución de código de jugador por nombre si no viene directo en el evento
  const findPlayerCode = (nombre?: string | null, codDirecto?: string | null): string | null => {
    if (codDirecto && codDirecto.trim()) return codDirecto.trim();
    if (!nombre || !nombre.trim()) return null;
    const norm = nombre.trim().toLowerCase();
    const allPlayers = [...jugadoresLocal, ...jugadoresVisitante];
    const match = allPlayers.find(
      (j) => j.nombre_jugador && j.nombre_jugador.trim().toLowerCase() === norm
    );
    return match?.codjugador || null;
  };

  // Timeline cronológico unificado de goles y tarjetas
  interface MatchTimelineEvent {
    id: string;
    minuto: number;
    minutoRaw: string;
    equipo: 'local' | 'visitante';
    nombreEquipo: string;
    tipo: 'gol' | 'tarjeta';
    titulo: string;
    detalle?: string | null;
    nombreJugador: string;
    codjugador?: string | null;
    icono: 'gol' | 'amarilla' | 'roja' | 'doble_amarilla';
    marcadorMomento?: string;
  }

  const timelineEvents = useMemo<MatchTimelineEvent[]>(() => {
    const events: MatchTimelineEvent[] = [];

    // Goles locales
    golesLocalList.forEach((g, i) => {
      const minNum = parseInt(g.minuto || '0', 10) || 0;
      events.push({
        id: `gol-loc-${i}`,
        minuto: minNum,
        minutoRaw: g.minuto || '?',
        equipo: 'local',
        nombreEquipo: equipoLocal,
        tipo: 'gol',
        titulo: 'Gol',
        detalle: g.tipo_gol && g.tipo_gol.toLowerCase() !== 'normal' ? g.tipo_gol : null,
        nombreJugador: g.nombre_jugador || 'Goleador',
        codjugador: findPlayerCode(g.nombre_jugador, g.codjugador),
        icono: 'gol',
      });
    });

    // Goles visitantes
    golesVisitanteList.forEach((g, i) => {
      const minNum = parseInt(g.minuto || '0', 10) || 0;
      events.push({
        id: `gol-vis-${i}`,
        minuto: minNum,
        minutoRaw: g.minuto || '?',
        equipo: 'visitante',
        nombreEquipo: equipoVisitante,
        tipo: 'gol',
        titulo: 'Gol',
        detalle: g.tipo_gol && g.tipo_gol.toLowerCase() !== 'normal' ? g.tipo_gol : null,
        nombreJugador: g.nombre_jugador || 'Goleador',
        codjugador: findPlayerCode(g.nombre_jugador, g.codjugador),
        icono: 'gol',
      });
    });

    // Tarjetas locales
    tarjetasLocalList.forEach((t, i) => {
      const minNum = parseInt(t.minuto || '0', 10) || 0;
      const isRed = t.codigo_tipo_amonestacion === '200';
      const isSecondYellow = t.segunda_amarilla === '1';
      events.push({
        id: `tar-loc-${i}`,
        minuto: minNum,
        minutoRaw: t.minuto || '?',
        equipo: 'local',
        nombreEquipo: equipoLocal,
        tipo: 'tarjeta',
        titulo: isRed ? 'Tarjeta Roja' : isSecondYellow ? 'Doble Amarilla' : 'Tarjeta Amarilla',
        nombreJugador: t.nombre_jugador || 'Jugador',
        codjugador: findPlayerCode(t.nombre_jugador, t.codjugador),
        icono: isRed ? 'roja' : isSecondYellow ? 'doble_amarilla' : 'amarilla',
      });
    });

    // Tarjetas visitantes
    tarjetasVisitanteList.forEach((t, i) => {
      const minNum = parseInt(t.minuto || '0', 10) || 0;
      const isRed = t.codigo_tipo_amonestacion === '200';
      const isSecondYellow = t.segunda_amarilla === '1';
      events.push({
        id: `tar-vis-${i}`,
        minuto: minNum,
        minutoRaw: t.minuto || '?',
        equipo: 'visitante',
        nombreEquipo: equipoVisitante,
        tipo: 'tarjeta',
        titulo: isRed ? 'Tarjeta Roja' : isSecondYellow ? 'Doble Amarilla' : 'Tarjeta Amarilla',
        nombreJugador: t.nombre_jugador || 'Jugador',
        codjugador: findPlayerCode(t.nombre_jugador, t.codjugador),
        icono: isRed ? 'roja' : isSecondYellow ? 'doble_amarilla' : 'amarilla',
      });
    });

    const sorted = events.sort((a, b) => a.minuto - b.minuto);
    return computeRunningScores(sorted);
  }, [
    golesLocalList,
    golesVisitanteList,
    tarjetasLocalList,
    tarjetasVisitanteList,
    jugadoresLocal,
    jugadoresVisitante,
    equipoLocal,
    equipoVisitante,
  ]);

  if (!isOpen || !partido) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              Acta Oficial RFFM #{partido.codacta}
            </span>
            {data.nombre_competicion && (
              <span className="text-xs text-slate-400 truncate max-w-[200px]">
                {data.nombre_competicion}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Marcador Principal */}
        <div className="p-5 bg-gradient-to-b from-slate-950/90 to-slate-900/60 border-b border-slate-800">
          <div className="grid grid-cols-7 items-center gap-2 text-center">
            {/* Local */}
            <div className="col-span-3 flex flex-col items-center gap-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center p-2 shadow-lg">
                {escudoLocal ? (
                  <img
                    src={escudoLocal}
                    alt={equipoLocal}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Shield className="w-7 h-7 text-slate-500" />
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                {equipoLocal}
              </h3>
            </div>

            {/* Resultado o Estado */}
            <div className="col-span-1 flex flex-col items-center justify-center space-y-1">
              {hasScore ? (
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-white">{golesLocal}</span>
                  <span className="text-slate-600 font-bold">-</span>
                  <span className="text-2xl sm:text-3xl font-black text-white">{golesVisitante}</span>
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-400">VS</div>
              )}

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                data.acta_cerrada === '1' 
                  ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                  : data.partido_en_juego === '1'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
              }`}>
                {data.acta_cerrada === '1' ? 'FINALIZADO' : data.partido_en_juego === '1' ? 'EN JUEGO' : 'PROGRAMADO'}
              </span>
            </div>

            {/* Visitante */}
            <div className="col-span-3 flex flex-col items-center gap-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center p-2 shadow-lg">
                {escudoVisitante ? (
                  <img
                    src={escudoVisitante}
                    alt={equipoVisitante}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Shield className="w-7 h-7 text-slate-500" />
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                {equipoVisitante}
              </h3>
            </div>
          </div>

          {/* Fecha, Hora y Campo */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
            {(data.fecha || partido.fecha) && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {data.fecha || partido.fecha}
              </span>
            )}
            {(data.hora || partido.hora) && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {data.hora || partido.hora}
              </span>
            )}
            {campo && (
              <span className="flex items-center gap-1 truncate max-w-[280px]" title={campo}>
                <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate">{campo}</span>
              </span>
            )}
          </div>

          {/* Acciones de Partido: «Cómo llegar» y «Añadir a mi calendario» */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-center gap-2">
            {campo && (
              <a
                href={getGoogleMapsUrl(campo)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold border border-slate-700/80 transition-all active:scale-95 shadow-sm"
                title="Abrir ubicación en Google Maps"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Cómo llegar</span>
              </a>
            )}

            <a
              href={getGoogleCalendarUrl({
                local: equipoLocal,
                visitante: equipoVisitante,
                fecha: data.fecha || partido.fecha,
                hora: data.hora || partido.hora,
                campo: campo,
                competicion: data.nombre_competicion,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold border border-slate-700/80 transition-all active:scale-95 shadow-sm"
              title="Añadir evento a Google Calendar"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Google Cal</span>
            </a>

            <button
              type="button"
              onClick={() =>
                downloadIcsFile({
                  local: equipoLocal,
                  visitante: equipoVisitante,
                  fecha: data.fecha || partido.fecha,
                  hora: data.hora || partido.hora,
                  campo: campo,
                  competicion: data.nombre_competicion,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold border border-slate-700/80 transition-all active:scale-95 shadow-sm"
              title="Descargar archivo .ics para Apple Calendar / Outlook / Móvil"
            >
              <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Descargar .ics</span>
            </button>
          </div>
        </div>

        {/* Pestañas de navegación interna */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-3">
          <button
            onClick={() => setActiveTab('incidencias')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'incidencias'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Incidencias ({golesLocalList.length + golesVisitanteList.length} goles)
          </button>
          <button
            onClick={() => setActiveTab('alineaciones')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'alineaciones'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Alineaciones
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'info'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Información & Árbitros
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs font-medium">Recuperando acta oficial desde la RFFM...</p>
            </div>
          ) : error ? (
            <div className="py-10 px-4 bg-slate-950/60 border border-slate-800 rounded-3xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Acta no disponible aún</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">{error}</p>
            </div>
          ) : activeTab === 'incidencias' ? (
            <div className="space-y-3.5">
              {/* Resumen numérico de incidencias */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Cronología del encuentro
                </span>
                <div className="flex items-center gap-2.5 sm:gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold" title="Goles totales">
                    <span>⚽</span> {golesLocalList.length + golesVisitanteList.length}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold" title="Tarjetas amarillas">
                    <span className="w-2.5 h-3 bg-amber-400 rounded-xs inline-block" />{' '}
                    {tarjetasLocalList.filter((t) => t.codigo_tipo_amonestacion !== '200' && t.segunda_amarilla !== '1').length +
                      tarjetasVisitanteList.filter((t) => t.codigo_tipo_amonestacion !== '200' && t.segunda_amarilla !== '1').length}
                  </span>
                  <span className="flex items-center gap-1 text-rose-400 font-bold" title="Tarjetas rojas">
                    <span className="w-2.5 h-3 bg-rose-500 rounded-xs inline-block" />{' '}
                    {tarjetasLocalList.filter((t) => t.codigo_tipo_amonestacion === '200' || t.segunda_amarilla === '1').length +
                      tarjetasVisitanteList.filter((t) => t.codigo_tipo_amonestacion === '200' || t.segunda_amarilla === '1').length}
                  </span>
                </div>
              </div>

              {timelineEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <p className="text-xs italic">No hay goles ni amonestaciones registradas en el acta oficial.</p>
                </div>
              ) : (
                <div className="relative pl-5 sm:pl-7 space-y-2.5 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800/80">
                  {timelineEvents.map((event) => {
                    const isLocal = event.equipo === 'local';
                    const isGoal = event.tipo === 'gol';
                    const isRed = event.icono === 'roja' || event.icono === 'doble_amarilla';

                    return (
                      <div
                        key={event.id}
                        className="relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition-all text-xs shadow-sm"
                      >
                        {/* Nodo del timeline */}
                        <span
                          className={`absolute -left-[18px] sm:-left-[22px] w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                            isGoal
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                              : isRed
                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                              : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                          }`}
                        />

                        {/* Minuto con ancho fijo para mantener perfecta alineación */}
                        <span className="w-9 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-mono font-black text-xs text-white shrink-0 shadow-inner">
                          {event.minutoRaw}'
                        </span>

                        {/* Icono del evento */}
                        <div className="shrink-0 flex items-center justify-center w-5">
                          {isGoal ? (
                            <span className="text-base select-none" role="img" aria-label="Gol">
                              ⚽
                            </span>
                          ) : isRed ? (
                            <span
                              className="w-3.5 h-4.5 rounded-xs bg-rose-600 border border-rose-400 inline-block shadow-sm"
                              title="Tarjeta Roja"
                            />
                          ) : (
                            <span
                              className="w-3.5 h-4.5 rounded-xs bg-amber-400 border border-amber-300 inline-block shadow-sm"
                              title="Tarjeta Amarilla"
                            />
                          )}
                        </div>

                        {/* Contenido: Nombre de jugador interactivo y equipo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {event.codjugador ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPlayer(event.codjugador)}
                                className="group/player inline-flex items-center gap-1 font-bold text-white hover:text-blue-300 transition-colors text-xs text-left"
                                title="Ver ficha del jugador"
                              >
                                <span className="underline decoration-dotted underline-offset-2">
                                  {event.nombreJugador}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 text-slate-500 group-hover/player:text-blue-400 shrink-0" />
                              </button>
                            ) : (
                              <span className="font-bold text-slate-200 text-xs">
                                {event.nombreJugador}
                              </span>
                            )}

                            {event.detalle && (
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                {event.detalle}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span
                              className={`font-semibold px-1.5 py-0.2 rounded ${
                                isLocal
                                  ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              }`}
                            >
                              {isLocal ? 'Local' : 'Visitante'}: {event.nombreEquipo}
                            </span>
                            <span>• {event.titulo}</span>
                          </div>
                        </div>

                        {/* Marcador acumulado del gol pegado a la derecha */}
                        {event.marcadorMomento && (
                          <div className="shrink-0 ml-1.5 self-center">
                            <span
                              className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 font-mono font-black text-xs shadow-sm inline-flex items-center"
                              title={`Marcador tras este gol: ${event.marcadorMomento}`}
                            >
                              {event.marcadorMomento}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'alineaciones' ? (
            <div className="space-y-4">
              {/* Selector de equipo para alineaciones */}
              <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setTeamTab('local')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all truncate px-2 ${
                    teamTab === 'local'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {equipoLocal}
                </button>
                <button
                  onClick={() => setTeamTab('visitante')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all truncate px-2 ${
                    teamTab === 'visitante'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {equipoVisitante}
                </button>
              </div>

              {/* Lista de Jugadores */}
              {(() => {
                const titulares = teamTab === 'local' ? titularesLocal : titularesVisitante;
                const suplentes = teamTab === 'local' ? suplentesLocal : suplentesVisitante;
                const entrenador = teamTab === 'local' ? data.entrenador_local : data.entrenador_visitante;
                const delegado = teamTab === 'local' ? data.delegadolocal : data.delegado_visitante;

                if (titulares.length === 0 && suplentes.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <p className="text-xs">No hay alineaciones publicadas en el acta oficial todavía.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Titulares */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Titulares ({titulares.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {titulares.map((j, i) => (
                          <div
                            key={`tit-${i}`}
                            onClick={() => j.codjugador && handleOpenPlayer(j.codjugador)}
                            className={`flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs transition-all ${
                              j.codjugador
                                ? 'hover:border-blue-500/50 hover:bg-slate-900/80 cursor-pointer group'
                                : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="w-6 h-6 rounded-lg bg-slate-800 text-rose-400 font-extrabold flex items-center justify-center text-[11px] border border-slate-700 group-hover:text-blue-300">
                                {j.dorsal || '-'}
                              </span>
                              <div className="truncate">
                                <p className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{j.nombre_jugador}</p>
                                <p className="text-[10px] text-slate-400 truncate">{j.posicion || 'Jugador'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {j.capitan === '1' && (
                                <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded" title="Capitán">
                                  C
                                </span>
                              )}
                              {j.portero === '1' && (
                                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 rounded" title="Portero">
                                  P
                                </span>
                              )}
                              {j.codjugador && (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suplentes */}
                    {suplentes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Suplentes ({suplentes.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {suplentes.map((j, i) => (
                            <div
                              key={`sup-${i}`}
                              onClick={() => j.codjugador && handleOpenPlayer(j.codjugador)}
                              className={`flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-xs opacity-90 transition-all ${
                                j.codjugador
                                  ? 'hover:border-blue-500/50 hover:bg-slate-900/80 cursor-pointer group hover:opacity-100'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span className="w-6 h-6 rounded-lg bg-slate-800/60 text-slate-300 font-bold flex items-center justify-center text-[11px] border border-slate-700/60 group-hover:text-blue-300">
                                  {j.dorsal || '-'}
                                </span>
                                <div className="truncate">
                                  <p className="font-medium text-slate-200 truncate group-hover:text-blue-300 transition-colors">{j.nombre_jugador}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{j.posicion || 'Suplente'}</p>
                                </div>
                              </div>
                              {j.codjugador && (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cuerpo Técnico */}
                    {(entrenador || delegado) && (
                      <div className="pt-2 border-t border-slate-800 space-y-1 text-xs text-slate-400">
                        {entrenador && (
                          <p><span className="font-semibold text-slate-300">Entrenador:</span> {entrenador}</p>
                        )}
                        {delegado && (
                          <p><span className="font-semibold text-slate-300">Delegado:</span> {delegado}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* INFO & ARBITROS */
            <div className="space-y-4">
              {/* Equipo Arbitral */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-rose-400" />
                  <span>Equipo Arbitral</span>
                </h4>
                {arbitros.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No hay árbitros asignados en el acta.</p>
                ) : (
                  <div className="space-y-2">
                    {arbitros.map((arb, i) => (
                      <div key={`arb-${i}`} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-medium text-white">{arb.nombre_arbitro}</span>
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          {arb.tipo_arbitro || 'Árbitro'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Instalación */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Instalación Deportiva</span>
                  </h4>
                  {campo && (
                    <a
                      href={getGoogleMapsUrl(campo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30 transition-all"
                      title="Navegar en Google Maps"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Abrir Maps</span>
                    </a>
                  )}
                </div>
                <p className="text-white font-medium">{campo || 'Por definir'}</p>
                {data.codigo_campo && (
                  <p className="text-[11px] text-slate-500">Cód. Campo: {data.codigo_campo}</p>
                )}
              </div>

              {/* Enlace oficial RFFM */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
                <span>Acta oficial RFFM:</span>
                <a
                  href={`https://www.rffm.es/competiciones/acta-partido/${partido.codacta}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 underline font-medium"
                >
                  <span>Ver en RFFM.es</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            Cerrar Acta
          </button>
        </div>
      </div>

      {/* Modal con la ficha detallada del jugador */}
      <PlayerDetailModal
        isOpen={Boolean(selectedPlayerCode)}
        onClose={handleClosePlayer}
        playerDetail={playerDetail}
        isLoading={isPlayerDetailLoading}
        error={playerDetailError}
        onRetry={selectedPlayerCode ? () => handleOpenPlayer(selectedPlayerCode) : undefined}
      />
    </div>
  );
};
