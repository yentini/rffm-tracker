import React, { useState, useEffect, useRef } from 'react';
import { CalendarioResponse, Jornada, PartidoCalendario } from '../types';
import { ChevronLeft, ChevronRight, Shield, MapPin, Calendar as CalendarIcon, Clock, Sparkles, Filter, FileText } from 'lucide-react';

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

export const CalendarSlider: React.FC<CalendarSliderProps> = ({
  calendario,
  isLoading,
  selectedTeam = '',
  onClearTeam,
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 animate-pulse">
        <div className="h-10 bg-slate-800/80 rounded-2xl" />
        <div className="h-28 bg-slate-800/50 rounded-2xl" />
        <div className="h-28 bg-slate-800/50 rounded-2xl" />
        <div className="h-28 bg-slate-800/50 rounded-2xl" />
      </div>
    );
  }

  if (!calendario || calendario.rounds.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-2">
        <CalendarIcon className="w-8 h-8 text-slate-500 mx-auto" />
        <p className="text-sm font-medium">No se han encontrado jornadas para este grupo.</p>
      </div>
    );
  }

  // --- MODO 1: FILTRADO POR EQUIPO (Partidos unos encima de otros, sin navegación horizontal) ---
  if (selectedTeam) {
    interface PartidoConJornada extends PartidoCalendario {
      numeroJornada: number;
      nombreJornada: string;
    }

    const teamMatches: PartidoConJornada[] = [];
    let teamName = '';

    calendario.rounds.forEach((round) => {
      round.partidos.forEach((partido) => {
        const isLocal = partido.codigo_equipo_local === selectedTeam;
        const isVisitante = partido.codigo_equipo_visitante === selectedTeam;
        if (isLocal || isVisitante) {
          if (!teamName) {
            teamName = isLocal ? partido.equipo_local : partido.equipo_visitante;
          }
          teamMatches.push({
            ...partido,
            numeroJornada: round.numero_jornada,
            nombreJornada: round.nombre_jornada,
          });
        }
      });
    });

    return (
      <div className="space-y-4">
        {/* Cabecera del filtro por equipo */}
        <div className="bg-slate-900/95 border border-rose-500/30 rounded-3xl p-4 shadow-xl backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Filtro por equipo activo
              </p>
              <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                {teamName || 'Equipo seleccionado'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
              {teamMatches.length} partidos
            </span>
            {onClearTeam && (
              <button
                onClick={onClearTeam}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-all"
                title="Volver a vista por jornadas"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Listado vertical de partidos de ese equipo */}
        <div className="space-y-3">
          {teamMatches.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
              <p className="text-xs">No se encontraron partidos para este equipo.</p>
            </div>
          ) : (
            teamMatches.map((partido) => {
              const hasScore = partido.goles_local !== null && partido.goles_visitante !== null;
              const isSelectedLocal = partido.codigo_equipo_local === selectedTeam;
              const isSelectedVisitante = partido.codigo_equipo_visitante === selectedTeam;

              return (
                <div
                  key={`${partido.codacta}-${partido.numeroJornada}`}
                  onClick={() => onSelectMatch?.(partido)}
                  role="button"
                  tabIndex={0}
                  className="bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 rounded-3xl p-4 shadow-md transition-all hover:bg-slate-900/90 active:scale-[0.99] space-y-3 cursor-pointer group"
                >
                  {/* Encabezado: Jornada, Fecha y Campo */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 text-[10px]">
                        Jornada {partido.numeroJornada}
                      </span>
                      <div className="flex items-center gap-1 text-slate-300 font-medium">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{partido.fecha || 'Fecha por definir'}</span>
                        {partido.hora && <span>• {partido.hora}</span>}
                      </div>
                    </div>

                    {partido.campo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCampo?.(partido.codigo_campo, partido.campo, partido.fecha);
                        }}
                        className="flex items-center gap-1 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 px-2 py-0.5 rounded-lg border border-transparent hover:border-amber-500/30 transition-all truncate max-w-[170px] text-[11px] group/campo"
                        title={`Ver agenda de partidos en ${partido.campo}`}
                      >
                        <MapPin className="w-3 h-3 text-emerald-400 group-hover/campo:text-amber-400 shrink-0" />
                        <span className="truncate underline decoration-dotted underline-offset-2">{partido.campo}</span>
                      </button>
                    )}
                  </div>

                  {/* Enfrentamiento */}
                  <div className="grid grid-cols-12 items-center gap-2">
                    {/* Equipo Local */}
                    <div className="col-span-5 flex flex-col items-center text-center space-y-1.5">
                      <div className={`w-12 h-12 rounded-full p-2 flex items-center justify-center border shadow-inner overflow-hidden ${
                        isSelectedLocal 
                          ? 'bg-rose-950/40 border-rose-500/60 ring-2 ring-rose-500/30' 
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
                                svg.setAttribute('class', 'w-5 h-5 text-slate-500');
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
                          <Shield className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <span className={`text-xs leading-tight line-clamp-2 ${
                        isSelectedLocal ? 'font-bold text-rose-300' : 'font-semibold text-slate-200'
                      }`}>
                        {partido.equipo_local}
                      </span>
                    </div>

                    {/* Marcador Central */}
                    <div className="col-span-2 flex flex-col items-center justify-center">
                      {hasScore ? (
                        <div className="flex items-center gap-1.5 text-lg font-black tracking-tight text-white bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
                          <span className={Number(partido.goles_local) > Number(partido.goles_visitante) ? 'text-red-400' : 'text-slate-200'}>
                            {partido.goles_local}
                          </span>
                          <span className="text-slate-600 font-light">:</span>
                          <span className={Number(partido.goles_visitante) > Number(partido.goles_local) ? 'text-red-400' : 'text-slate-200'}>
                            {partido.goles_visitante}
                          </span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono font-medium text-slate-400 shadow-inner">
                          VS
                        </div>
                      )}
                    </div>

                    {/* Equipo Visitante */}
                    <div className="col-span-5 flex flex-col items-center text-center space-y-1.5">
                      <div className={`w-12 h-12 rounded-full p-2 flex items-center justify-center border shadow-inner overflow-hidden ${
                        isSelectedVisitante 
                          ? 'bg-rose-950/40 border-rose-500/60 ring-2 ring-rose-500/30' 
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
                                svg.setAttribute('class', 'w-5 h-5 text-slate-500');
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
                          <Shield className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <span className={`text-xs leading-tight line-clamp-2 ${
                        isSelectedVisitante ? 'font-bold text-rose-300' : 'font-semibold text-slate-200'
                      }`}>
                        {partido.equipo_visitante}
                      </span>
                    </div>

                  </div>

                  {/* Botón / Indicador de ver acta oficial */}
                  <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-rose-400 transition-colors">
                    <span className="flex items-center gap-1.5 font-medium">
                      <FileText className="w-3.5 h-3.5 text-rose-500/70" />
                      <span>Ver acta y alineaciones</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>

                </div>
              );
            })
          )}
        </div>
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
      className="space-y-4 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barra de Control y Navegación entre Jornadas (Sólo 1 a la vez) */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-3.5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          
          {/* Botón Jornada Anterior */}
          <button
            onClick={handlePrevRound}
            disabled={selectedRoundIndex === 0}
            aria-label="Jornada anterior"
            className="w-10 h-10 rounded-2xl bg-slate-800/80 hover:bg-slate-750 disabled:opacity-30 disabled:hover:bg-slate-800/80 text-white flex items-center justify-center transition-all active:scale-95 border border-slate-700/60 shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Indicador Central de Jornada */}
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="text-xs uppercase font-extrabold tracking-wider text-red-400">
                Jornada {currentJornada.numero_jornada}
              </span>
              {isActualRound && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" />
                  Actual
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 font-medium truncate">
              {currentJornada.nombre_jornada}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">
              ({selectedRoundIndex + 1} de {calendario.total_jornadas}) • Desliza con el dedo ↔
            </span>
          </div>

          {/* Botón Siguiente Jornada */}
          <button
            onClick={handleNextRound}
            disabled={selectedRoundIndex === calendario.rounds.length - 1}
            aria-label="Siguiente jornada"
            className="w-10 h-10 rounded-2xl bg-slate-800/80 hover:bg-slate-750 disabled:opacity-30 disabled:hover:bg-slate-800/80 text-white flex items-center justify-center transition-all active:scale-95 border border-slate-700/60 shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

        </div>
      </div>

      {/* Listado de Partidos Exclusivo de la Jornada Actual */}
      <div className="space-y-3">
        {currentJornada.partidos.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
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
                className="bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 rounded-3xl p-4 shadow-md transition-all hover:bg-slate-900/90 active:scale-[0.99] space-y-3 cursor-pointer group"
              >
                {/* Cabecera del Partido: Fecha, Hora y Campo */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Clock className="w-3 h-3 text-red-400" />
                    <span>{partido.fecha || 'Fecha por definir'}</span>
                    {partido.hora && <span>• {partido.hora}</span>}
                  </div>

                  {partido.campo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCampo?.(partido.codigo_campo, partido.campo, partido.fecha);
                      }}
                      className="flex items-center gap-1 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 px-2 py-0.5 rounded-lg border border-transparent hover:border-amber-500/30 transition-all truncate max-w-[180px] text-[11px] group/campo"
                      title={`Ver agenda de partidos en ${partido.campo}`}
                    >
                      <MapPin className="w-3 h-3 text-emerald-400 group-hover/campo:text-amber-400 shrink-0" />
                      <span className="truncate underline decoration-dotted underline-offset-2">{partido.campo}</span>
                    </button>
                  )}
                </div>

                {/* Enfrentamiento entre Equipos */}
                <div className="grid grid-cols-12 items-center gap-2">
                  
                  {/* Equipo Local */}
                  <div className="col-span-5 flex flex-col items-center text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-full bg-slate-950 p-2 flex items-center justify-center border border-slate-800 shadow-inner overflow-hidden">
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
                              svg.setAttribute('class', 'w-5 h-5 text-slate-500');
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
                        <Shield className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">
                      {partido.equipo_local}
                    </span>
                  </div>

                  {/* Marcador Central */}
                  <div className="col-span-2 flex flex-col items-center justify-center">
                    {hasScore ? (
                      <div className="flex items-center gap-1.5 text-lg font-black tracking-tight text-white bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
                        <span className={Number(partido.goles_local) > Number(partido.goles_visitante) ? 'text-red-400' : 'text-slate-200'}>
                          {partido.goles_local}
                        </span>
                        <span className="text-slate-600 font-light">:</span>
                        <span className={Number(partido.goles_visitante) > Number(partido.goles_local) ? 'text-red-400' : 'text-slate-200'}>
                          {partido.goles_visitante}
                        </span>
                      </div>
                    ) : (
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono font-medium text-slate-400 shadow-inner">
                        VS
                      </div>
                    )}
                  </div>

                  {/* Equipo Visitante */}
                  <div className="col-span-5 flex flex-col items-center text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-full bg-slate-950 p-2 flex items-center justify-center border border-slate-800 shadow-inner overflow-hidden">
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
                              svg.setAttribute('class', 'w-5 h-5 text-slate-500');
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
                        <Shield className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">
                      {partido.equipo_visitante}
                    </span>
                  </div>

                </div>

                {/* Botón / Indicador de ver acta oficial */}
                <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-rose-400 transition-colors">
                  <span className="flex items-center gap-1.5 font-medium">
                    <FileText className="w-3.5 h-3.5 text-rose-500/70" />
                    <span>Ver acta y alineaciones</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
