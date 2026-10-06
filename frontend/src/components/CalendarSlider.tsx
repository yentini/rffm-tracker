import React, { useState, useEffect, useRef } from 'react';
import { CalendarioResponse, Jornada, PartidoCalendario } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  FileText,
  Navigation,
  CalendarPlus,
} from 'lucide-react';
import { getGoogleMapsUrl, downloadIcsFile } from '../utils/matchActions';

interface CalendarSliderProps {
  calendario: CalendarioResponse | null;
  isLoading: boolean;
  selectedTeam?: string;
  onClearTeam?: () => void;
  onSelectMatch?: (partido: PartidoCalendario) => void;
  onSelectCampo?: (codigoCampo?: string | null, nombreCampo?: string | null, fecha?: string | null) => void;
}

/**
 * Obtiene la URL absoluta del escudo:
 * - Si ya incluye 'http', se recupera tal cual sin concatenar nada.
 * - Si es relativa, se concatena con https://appweb.rffm.es
 */
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

interface MatchOutcome {
  label: string;
  badgeClass: string;
  dotClass: string;
}

/**
 * Determina el resultado visual (Victoria, Empate, Derrota, Pendiente)
 * del partido para el equipo seleccionado.
 */
const getTeamMatchOutcome = (
  partido: PartidoCalendario,
  selectedTeamCode: string
): MatchOutcome => {
  const hasScore = partido.goles_local !== null && partido.goles_visitante !== null;
  if (!hasScore) {
    return {
      label: 'Por jugar',
      badgeClass: 'bg-slate-800/90 text-slate-400 border-slate-700/80',
      dotClass: 'bg-slate-500',
    };
  }

  const gl = Number(partido.goles_local);
  const gv = Number(partido.goles_visitante);
  const isLocal = partido.codigo_equipo_local === selectedTeamCode;

  if (gl === gv) {
    return {
      label: 'Empate',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      dotClass: 'bg-amber-400',
    };
  }

  const won = isLocal ? gl > gv : gv > gl;
  return won
    ? {
        label: 'Victoria',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dotClass: 'bg-emerald-400',
      }
    : {
        label: 'Derrota',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dotClass: 'bg-rose-400',
      };
};

export const CalendarSlider: React.FC<CalendarSliderProps> = ({
  calendario,
  isLoading,
  selectedTeam = '',
  onSelectMatch,
  onSelectCampo,
}) => {
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Inicializar en la jornada actual indicada por el backend
  useEffect(() => {
    if (calendario && calendario.rounds.length > 0) {
      const activeIdx = calendario.rounds.findIndex(
        (r) => r.numero_jornada === calendario.current_round
      );
      setSelectedRoundIndex(activeIdx !== -1 ? activeIdx : 0);
    }
  }, [calendario]);

  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 animate-pulse">
        <div className="h-10 bg-slate-800/80 rounded-2xl" />
        <div className="h-24 sm:h-28 bg-slate-800/50 rounded-2xl" />
        <div className="h-24 sm:h-28 bg-slate-800/50 rounded-2xl" />
        <div className="h-24 sm:h-28 bg-slate-800/50 rounded-2xl" />
      </div>
    );
  }

  if (!calendario || calendario.rounds.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center text-slate-400 space-y-2">
        <CalendarIcon className="w-8 h-8 text-slate-500 mx-auto" />
        <p className="text-xs sm:text-sm font-medium">No se han encontrado jornadas para este grupo.</p>
      </div>
    );
  }

  // --- MODO 1: FILTRADO POR EQUIPO (Partidos en lista vertical continua con Jornadas y Resultados muy destacados) ---
  if (selectedTeam) {
    interface PartidoConJornada extends PartidoCalendario {
      numeroJornada: number;
      nombreJornada: string;
    }

    const teamMatches: PartidoConJornada[] = [];

    calendario.rounds.forEach((round) => {
      round.partidos.forEach((partido) => {
        const isLocal = partido.codigo_equipo_local === selectedTeam;
        const isVisitante = partido.codigo_equipo_visitante === selectedTeam;
        if (isLocal || isVisitante) {
          teamMatches.push({
            ...partido,
            numeroJornada: round.numero_jornada,
            nombreJornada: round.nombre_jornada,
          });
        }
      });
    });

    return (
      <div className="space-y-3 sm:space-y-3.5">
        {teamMatches.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-slate-800">
            <p className="text-xs">No se encontraron partidos para este equipo en el calendario.</p>
          </div>
        ) : (
          teamMatches.map((partido) => {
            const hasScore = partido.goles_local !== null && partido.goles_visitante !== null;
            const isSelectedLocal = partido.codigo_equipo_local === selectedTeam;
            const isSelectedVisitante = partido.codigo_equipo_visitante === selectedTeam;
            const outcome = getTeamMatchOutcome(partido, selectedTeam);

            return (
              <div
                key={`${partido.codacta}-${partido.numeroJornada}`}
                onClick={() => onSelectMatch?.(partido)}
                role="button"
                tabIndex={0}
                className="bg-slate-900/90 border border-slate-800 hover:border-red-500/50 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-lg shadow-black/20 transition-all hover:bg-slate-900 active:scale-[0.99] space-y-3 cursor-pointer group"
              >
                {/* Cabecera de la Tarjeta: Jornada en grande, condición Casa/Fuera, Resultado y Fecha/Campo */}
                <div className="pb-2.5 border-b border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {/* Número de Jornada y Casa/Fuera bien visibles y destacados */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="inline-flex items-center font-black text-xs sm:text-sm tracking-wider uppercase text-white bg-gradient-to-r from-red-600 to-rose-600 px-3 py-1 rounded-xl shadow-md shadow-red-950/40 border border-red-500/40">
                        Jornada {partido.numeroJornada}
                      </span>
                      <span className={`text-[10px] sm:text-[11px] font-extrabold px-2 sm:px-2.5 py-1 rounded-xl border uppercase tracking-wider ${
                        isSelectedLocal
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      }`}>
                        {isSelectedLocal ? 'En casa' : 'Fuera'}
                      </span>
                    </div>

                    {/* Estado del resultado para el equipo seleccionado */}
                    <span className={`text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-sm tracking-wide shrink-0 ${outcome.badgeClass}`}>
                      <span className={`w-2 h-2 rounded-full ${outcome.dotClass}`}></span>
                      <span>{outcome.label}</span>
                    </span>
                  </div>

                  {/* Fila secundaria: Fecha, hora y campo deportivo */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 gap-1.5 pt-0.5">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium shrink-0">
                      <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{partido.fecha || 'Fecha por definir'}</span>
                      {partido.hora && <span className="text-slate-400 font-normal">• {partido.hora}</span>}
                    </div>

                    {partido.campo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCampo?.(partido.codigo_campo, partido.campo, partido.fecha);
                        }}
                        className="flex items-center gap-1 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 px-1.5 py-0.5 rounded-lg border border-transparent hover:border-amber-500/30 transition-all truncate text-[11px] group/campo ml-auto min-w-0"
                        title={`Ver agenda de partidos en ${partido.campo}`}
                      >
                        <MapPin className="w-3 h-3 text-emerald-400 group-hover/campo:text-amber-400 shrink-0" />
                        <span className="truncate underline decoration-dotted underline-offset-2">{partido.campo}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Enfrentamiento entre Equipos con Tu Equipo destacado */}
                <div className="grid grid-cols-12 items-center gap-1.5 sm:gap-2 pt-0.5">
                  {/* Equipo Local */}
                  <div className={`col-span-5 flex flex-col items-center text-center space-y-1 p-1.5 rounded-2xl transition-all ${
                    isSelectedLocal ? 'bg-rose-950/20 border border-rose-500/30' : ''
                  }`}>
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full p-1.5 sm:p-2 flex items-center justify-center border shadow-inner overflow-hidden ${
                      isSelectedLocal 
                        ? 'bg-rose-950/40 border-rose-500/70 ring-2 ring-rose-500/40' 
                        : 'bg-slate-950 border-slate-800'
                    }`}>
                      {getEscudoUrl(partido.escudo_equipo_local) ? (
                        <img
                          src={getEscudoUrl(partido.escudo_equipo_local)!}
                          alt={partido.equipo_local}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('svg')) {
                              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                              svg.setAttribute('class', 'w-4 h-4 text-slate-500');
                              svg.setAttribute('viewBox', '0 0 24 24');
                              svg.setAttribute('fill', 'none');
                              svg.setAttribute('stroke', 'currentColor');
                              svg.setAttribute('stroke-width', '2');
                              svg.innerHTML = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';
                              parent.appendChild(svg);
                            }
                          }}
                        />
                      ) : (
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                      )}
                    </div>
                    <span className={`text-[11px] sm:text-xs leading-tight line-clamp-2 ${
                      isSelectedLocal ? 'font-bold text-rose-300' : 'font-semibold text-slate-300'
                    }`}>
                      {partido.equipo_local}
                    </span>
                    {isSelectedLocal && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
                        Tu equipo
                      </span>
                    )}
                  </div>

                  {/* Marcador Central */}
                  <div className="col-span-2 flex flex-col items-center justify-center">
                    {hasScore ? (
                      <div className="flex items-center gap-1 sm:gap-1.5 text-base sm:text-xl font-black tracking-tight text-white bg-slate-950 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-800 shadow-inner">
                        <span className={Number(partido.goles_local) > Number(partido.goles_visitante) ? 'text-red-400' : 'text-slate-200'}>
                          {partido.goles_local}
                        </span>
                        <span className="text-slate-600 font-light">:</span>
                        <span className={Number(partido.goles_visitante) > Number(partido.goles_local) ? 'text-red-400' : 'text-slate-200'}>
                          {partido.goles_visitante}
                        </span>
                      </div>
                    ) : (
                      <div className="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] sm:text-[11px] font-mono font-medium text-slate-400 shadow-inner">
                        VS
                      </div>
                    )}
                  </div>

                  {/* Equipo Visitante */}
                  <div className={`col-span-5 flex flex-col items-center text-center space-y-1 p-1.5 rounded-2xl transition-all ${
                    isSelectedVisitante ? 'bg-rose-950/20 border border-rose-500/30' : ''
                  }`}>
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full p-1.5 sm:p-2 flex items-center justify-center border shadow-inner overflow-hidden ${
                      isSelectedVisitante 
                        ? 'bg-rose-950/40 border-rose-500/70 ring-2 ring-rose-500/40' 
                        : 'bg-slate-950 border-slate-800'
                    }`}>
                      {getEscudoUrl(partido.escudo_equipo_visitante) ? (
                        <img
                          src={getEscudoUrl(partido.escudo_equipo_visitante)!}
                          alt={partido.equipo_visitante}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('svg')) {
                              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                              svg.setAttribute('class', 'w-4 h-4 text-slate-500');
                              svg.setAttribute('viewBox', '0 0 24 24');
                              svg.setAttribute('fill', 'none');
                              svg.setAttribute('stroke', 'currentColor');
                              svg.setAttribute('stroke-width', '2');
                              svg.innerHTML = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';
                              parent.appendChild(svg);
                            }
                          }}
                        />
                      ) : (
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                      )}
                    </div>
                    <span className={`text-[11px] sm:text-xs leading-tight line-clamp-2 ${
                      isSelectedVisitante ? 'font-bold text-rose-300' : 'font-semibold text-slate-300'
                    }`}>
                      {partido.equipo_visitante}
                    </span>
                    {isSelectedVisitante && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
                        Tu equipo
                      </span>
                    )}
                  </div>
                </div>

                {/* Botón / Indicador de ver acta oficial y acciones rápidas */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium group-hover:text-red-400 transition-colors">
                    <FileText className="w-3.5 h-3.5 text-red-500/70" />
                    <span>Ver acta y alineaciones</span>
                  </span>

                  <div className="flex items-center gap-1">
                    {partido.campo && (
                      <a
                        href={getGoogleMapsUrl(partido.campo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 transition-all"
                        title={`Cómo llegar a ${partido.campo} (Google Maps)`}
                      >
                        <Navigation className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadIcsFile({
                          local: partido.equipo_local,
                          visitante: partido.equipo_visitante,
                          fecha: partido.fecha,
                          hora: partido.hora,
                          campo: partido.campo,
                        });
                      }}
                      title="Añadir a mi calendario (.ics)"
                      className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-blue-500/40 text-slate-400 hover:text-blue-400 transition-all"
                    >
                      <CalendarPlus className="w-3 h-3" />
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-1 transition-transform text-slate-500" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // --- MODO 2: NAVEGACIÓN HORIZONTAL POR JORNADAS (Comportamiento habitual sin equipo seleccionado) ---
  const currentJornada: Jornada = calendario.rounds[selectedRoundIndex] || calendario.rounds[0];
  const isActualRound = currentJornada.numero_jornada === calendario.current_round;

  const handlePrevRound = () => {
    if (selectedRoundIndex > 0) {
      setSelectedRoundIndex((prev) => prev - 1);
    }
  };

  const handleNextRound = () => {
    if (selectedRoundIndex < calendario.rounds.length - 1) {
      setSelectedRoundIndex((prev) => prev + 1);
    }
  };

  // Gestos táctiles de swipe para dispositivos móviles
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      handleNextRound();
    } else if (distance < -minSwipeDistance) {
      handlePrevRound();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div 
      className="space-y-3 sm:space-y-4 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barra de Control y Navegación entre Jornadas (Destacada y Clara) */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900/95 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          
          {/* Botón Jornada Anterior */}
          <button
            onClick={handlePrevRound}
            disabled={selectedRoundIndex === 0}
            aria-label="Jornada anterior"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-750 disabled:opacity-25 disabled:hover:bg-slate-800/90 text-white flex items-center justify-center transition-all active:scale-95 border border-slate-700/60 shadow-md shrink-0 group"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Indicador Central de Jornada en Grande y Destacado */}
          <div className="flex-1 text-center min-w-0 px-1">
            <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
              <span className="text-base sm:text-xl font-black uppercase tracking-tight text-white drop-shadow-sm">
                Jornada {currentJornada.numero_jornada}
              </span>
              {isActualRound ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Jornada Actual
                </span>
              ) : (
                calendario.current_round && (
                  <button
                    type="button"
                    onClick={() => {
                      const activeIdx = calendario.rounds.findIndex(
                        (r) => r.numero_jornada === calendario.current_round
                      );
                      if (activeIdx !== -1) setSelectedRoundIndex(activeIdx);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all active:scale-95 shadow-sm"
                    title="Ir a la jornada actual"
                  >
                    <span>Ir a J.{calendario.current_round}</span>
                    <span>→</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300 truncate max-w-[200px]">
                {currentJornada.nombre_jornada}
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-[11px] text-slate-400 shrink-0">
                {selectedRoundIndex + 1} de {calendario.total_jornadas}
              </span>
            </div>
            
            {/* Barra de progreso de la temporada */}
            <div className="w-full bg-slate-950/80 rounded-full h-1 mt-2.5 overflow-hidden border border-slate-800/80">
              <div 
                className="bg-gradient-to-r from-red-600 to-rose-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${((selectedRoundIndex + 1) / calendario.total_jornadas) * 100}%` }}
              />
            </div>
          </div>

          {/* Botón Siguiente Jornada */}
          <button
            onClick={handleNextRound}
            disabled={selectedRoundIndex === calendario.rounds.length - 1}
            aria-label="Siguiente jornada"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-750 disabled:opacity-25 disabled:hover:bg-slate-800/90 text-white flex items-center justify-center transition-all active:scale-95 border border-slate-700/60 shadow-md shrink-0 group"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>

        </div>
      </div>

      {/* Listado de Partidos Exclusivo de la Jornada Actual */}
      <div className="space-y-2.5 sm:space-y-3">
        {currentJornada.partidos.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-slate-800">
            <p className="text-xs">No hay partidos registrados en esta jornada.</p>
          </div>
        ) : (
          currentJornada.partidos.map((partido: PartidoCalendario) => {
            const hasScore = partido.goles_local !== null && partido.goles_visitante !== null;

            return (
              <div
                key={partido.codacta}
                onClick={() => onSelectMatch?.(partido)}
                role="button"
                tabIndex={0}
                className="bg-slate-900/80 border border-slate-800 hover:border-red-500/40 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-md transition-all hover:bg-slate-900/90 active:scale-[0.99] space-y-2.5 sm:space-y-3 cursor-pointer group"
              >
                {/* Cabecera del Partido: Fecha, Hora, Estado y Campo */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800/60 gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium shrink-0">
                    <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{partido.fecha || 'Por definir'}</span>
                    {partido.hora && <span className="text-slate-400 font-normal">• {partido.hora}</span>}
                  </div>

                  <div className="flex items-center gap-2 ml-auto min-w-0">
                    {hasScore && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                        Finalizado
                      </span>
                    )}
                    {partido.campo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCampo?.(partido.codigo_campo, partido.campo, partido.fecha);
                        }}
                        className="flex items-center gap-1 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 px-1.5 py-0.5 rounded-lg border border-transparent hover:border-amber-500/30 transition-all truncate text-[11px] group/campo min-w-0"
                        title={`Ver agenda de partidos en ${partido.campo}`}
                      >
                        <MapPin className="w-3 h-3 text-emerald-400 group-hover/campo:text-amber-400 shrink-0" />
                        <span className="truncate underline decoration-dotted underline-offset-2">{partido.campo}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Enfrentamiento entre Equipos */}
                <div className="grid grid-cols-12 items-center gap-1.5 sm:gap-2">
                  
                  {/* Equipo Local */}
                  <div className="col-span-5 flex flex-col items-center text-center space-y-1">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-950 p-1.5 sm:p-2 flex items-center justify-center border border-slate-800 shadow-inner overflow-hidden">
                      {getEscudoUrl(partido.escudo_equipo_local) ? (
                        <img
                          src={getEscudoUrl(partido.escudo_equipo_local)!}
                          alt={partido.equipo_local}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('svg')) {
                              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                              svg.setAttribute('class', 'w-4 h-4 text-slate-500');
                              svg.setAttribute('viewBox', '0 0 24 24');
                              svg.setAttribute('fill', 'none');
                              svg.setAttribute('stroke', 'currentColor');
                              svg.setAttribute('stroke-width', '2');
                              svg.innerHTML = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';
                              parent.appendChild(svg);
                            }
                          }}
                        />
                      ) : (
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                      )}
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">
                      {partido.equipo_local}
                    </span>
                  </div>

                  {/* Marcador Central */}
                  <div className="col-span-2 flex flex-col items-center justify-center">
                    {hasScore ? (
                      <div className="flex items-center gap-1 sm:gap-1.5 text-base sm:text-lg font-black tracking-tight text-white bg-slate-950 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-800 shadow-inner">
                        <span className={Number(partido.goles_local) > Number(partido.goles_visitante) ? 'text-red-400' : 'text-slate-200'}>
                          {partido.goles_local}
                        </span>
                        <span className="text-slate-600 font-light">:</span>
                        <span className={Number(partido.goles_visitante) > Number(partido.goles_local) ? 'text-red-400' : 'text-slate-200'}>
                          {partido.goles_visitante}
                        </span>
                      </div>
                    ) : (
                      <div className="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] sm:text-[11px] font-mono font-medium text-slate-400 shadow-inner">
                        VS
                      </div>
                    )}
                  </div>

                  {/* Equipo Visitante */}
                  <div className="col-span-5 flex flex-col items-center text-center space-y-1">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-950 p-1.5 sm:p-2 flex items-center justify-center border border-slate-800 shadow-inner overflow-hidden">
                      {getEscudoUrl(partido.escudo_equipo_visitante) ? (
                        <img
                          src={getEscudoUrl(partido.escudo_equipo_visitante)!}
                          alt={partido.equipo_visitante}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('svg')) {
                              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                              svg.setAttribute('class', 'w-4 h-4 text-slate-500');
                              svg.setAttribute('viewBox', '0 0 24 24');
                              svg.setAttribute('fill', 'none');
                              svg.setAttribute('stroke', 'currentColor');
                              svg.setAttribute('stroke-width', '2');
                              svg.innerHTML = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';
                              parent.appendChild(svg);
                            }
                          }}
                        />
                      ) : (
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                      )}
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">
                      {partido.equipo_visitante}
                    </span>
                  </div>

                </div>

                {/* Botón / Indicador de ver acta oficial y acciones rápidas */}
                <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium group-hover:text-red-400 transition-colors">
                    <FileText className="w-3.5 h-3.5 text-red-500/70" />
                    <span>Ver acta y alineaciones</span>
                  </span>

                  <div className="flex items-center gap-1">
                    {partido.campo && (
                      <a
                        href={getGoogleMapsUrl(partido.campo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 transition-all"
                        title={`Cómo llegar a ${partido.campo} (Google Maps)`}
                      >
                        <Navigation className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadIcsFile({
                          local: partido.equipo_local,
                          visitante: partido.equipo_visitante,
                          fecha: partido.fecha,
                          hora: partido.hora,
                          campo: partido.campo,
                        });
                      }}
                      title="Añadir a mi calendario (.ics)"
                      className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-blue-500/40 text-slate-400 hover:text-blue-400 transition-all"
                    >
                      <CalendarPlus className="w-3 h-3" />
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform text-slate-500" />
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
