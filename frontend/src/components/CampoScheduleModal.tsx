import React, { useEffect, useState, useMemo, useRef } from 'react';
import { CampoDetailResponse } from '../types';
import { fetchCampoDetail, searchCampos, fetchActaPartido } from '../services/api';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Navigation,
  Loader2,
  Trophy,
  AlertCircle,
  Shield,
} from 'lucide-react';

interface CampoScheduleModalProps {
  codigoCampo?: string | null;
  nombreCampoFallback?: string | null;
  selectedDateFilter?: string | null;
  onClose: () => void;
  onSelectActa?: (codacta: string) => void;
}

interface MatchNameOverride {
  local: string;
  visitante: string;
  golesCasa?: string | null;
  golesFuera?: string | null;
}

/**
 * Obtiene la URL absoluta del escudo.
 */
const fixEscudo = (url?: string | null): string | null => {
  if (!url || !url.trim()) return null;
  const clean = url.trim();
  if (clean.startsWith('http')) return clean;
  return clean.startsWith('/') ? `https://appweb.rffm.es${clean}` : `https://appweb.rffm.es/${clean}`;
};

export const CampoScheduleModal: React.FC<CampoScheduleModalProps> = ({
  codigoCampo,
  nombreCampoFallback,
  selectedDateFilter,
  onClose,
  onSelectActa,
}) => {
  const [campoData, setCampoData] = useState<CampoDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string>('all');
  const [matchOverrides, setMatchOverrides] = useState<Record<string, MatchNameOverride>>({});
  const dateScrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let targetCodigo = codigoCampo;

        // Si no tenemos código directo pero sí nombre, buscamos el campo primero
        if (!targetCodigo && nombreCampoFallback && nombreCampoFallback.trim()) {
          const searchRes = await searchCampos(nombreCampoFallback.trim());
          if (searchRes.campos.length > 0) {
            targetCodigo = searchRes.campos[0].codigo;
          }
        }

        if (!targetCodigo) {
          throw new Error('No se pudo identificar el código de la instalación deportiva.');
        }

        const data = await fetchCampoDetail(targetCodigo);
        if (isSubscribed) {
          setCampoData(data);

          if (data.partidos.length > 0) {
            // Extraer todas las fechas ordenadas
            const allDates = Array.from(
              new Set(
                data.partidos
                  .map((p) => (p.fecha ? p.fecha.split(' ')[0].replace(/\//g, '-') : ''))
                  .filter(Boolean)
              )
            ).sort();

            let targetDate = '';

            // 1. Si el llamador sugirió una fecha específica (ej. clic en un partido concreto)
            if (selectedDateFilter) {
              const normalizedFilter = selectedDateFilter.split(' ')[0].replace(/\//g, '-');
              if (allDates.includes(normalizedFilter)) {
                targetDate = normalizedFilter;
              }
            }

            // 2. Si no se especificó o no existe, seleccionar inicialmente la jornada actual
            if (!targetDate && allDates.length > 0) {
              const now = new Date();
              const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

              // A) Si hoy tiene partidos en esta sede
              if (allDates.includes(todayStr)) {
                targetDate = todayStr;
              } else {
                // B) Si estamos en fin de semana (viernes, sábado, domingo), buscar en este fin de semana
                const dayOfWeek = now.getDay();
                let weekendMatch: string | undefined;

                if (dayOfWeek === 0) {
                  const yesterday = new Date(now);
                  yesterday.setDate(yesterday.getDate() - 1);
                  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                  if (allDates.includes(yStr)) weekendMatch = yStr;
                } else if (dayOfWeek === 6) {
                  const tomorrow = new Date(now);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const tStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                  if (allDates.includes(tStr)) weekendMatch = tStr;
                } else if (dayOfWeek === 5) {
                  const sat = new Date(now); sat.setDate(sat.getDate() + 1);
                  const satStr = `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, '0')}-${String(sat.getDate()).padStart(2, '0')}`;
                  const sun = new Date(now); sun.setDate(sun.getDate() + 2);
                  const sunStr = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}`;
                  if (allDates.includes(satStr)) weekendMatch = satStr;
                  else if (allDates.includes(sunStr)) weekendMatch = sunStr;
                }

                if (weekendMatch) {
                  targetDate = weekendMatch;
                } else {
                  // C) Próxima fecha con partidos (>= hoy)
                  const upcomingDate = allDates.find((d) => d >= todayStr);
                  if (upcomingDate) {
                    targetDate = upcomingDate;
                  } else {
                    // D) Última fecha jugada si la temporada o partidos ya pasaron
                    targetDate = allDates[allDates.length - 1];
                  }
                }
              }
            }

            if (targetDate) {
              setActiveDate(targetDate);
            }
          }
        }
      } catch (err: any) {
        if (isSubscribed) {
          console.error('Error al cargar agenda del campo:', err);
          setError(err.message || 'No se pudieron recuperar los partidos para esta sede.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [codigoCampo, nombreCampoFallback, selectedDateFilter]);

  // Extraer las fechas únicas de los partidos disponibles
  const availableDates = useMemo(() => {
    if (!campoData || !campoData.partidos) return [];
    const dateMap = new Map<string, number>();

    campoData.partidos.forEach((p) => {
      if (!p.fecha) return;
      const dayPart = p.fecha.split(' ')[0]; // YYYY-MM-DD
      dateMap.set(dayPart, (dateMap.get(dayPart) || 0) + 1);
    });

    return Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [campoData]);

  // Filtrar partidos según la fecha seleccionada
  const filteredPartidos = useMemo(() => {
    if (!campoData || !campoData.partidos) return [];
    if (activeDate === 'all') return campoData.partidos;

    return campoData.partidos.filter((p) => {
      if (!p.fecha) return false;
      return p.fecha.startsWith(activeDate);
    });
  }, [campoData, activeDate]);

  // Formatear fecha legible en español (ej. "Sábado, 10 de octubre")
  const formatDateLabel = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
      }
    } catch {
      // Ignorar fallback
    }
    return dateStr;
  };

  // Extraer hora legible HH:MM
  const formatTime = (fechaStr?: string | null): string => {
    if (!fechaStr) return '--:--';
    const parts = fechaStr.split(' ');
    if (parts.length > 1) {
      return parts[1].substring(0, 5);
    }
    return fechaStr;
  };

  // Desplazar automáticamente el contenedor horizontal para centrar el día seleccionado
  useEffect(() => {
    if (!isLoading && activeDate && dateScrollContainerRef.current) {
      const timer = setTimeout(() => {
        const container = dateScrollContainerRef.current;
        if (!container) return;

        const activeBtn = container.querySelector<HTMLElement>('[data-active="true"]');
        if (activeBtn) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = activeBtn.getBoundingClientRect();
          const scrollOffset =
            buttonRect.left + buttonRect.width / 2 - (containerRect.left + containerRect.width / 2);

          container.scrollTo({
            left: container.scrollLeft + scrollOffset,
            behavior: 'smooth',
          });
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [activeDate, isLoading, availableDates]);

  // Sincronizar nombres reales y actualizados desde el acta oficial para los partidos visibles
  useEffect(() => {
    if (!filteredPartidos || filteredPartidos.length === 0) return;

    let isCurrent = true;
    const pendingPartidos = filteredPartidos.filter(
      (p) => p.codacta && !matchOverrides[p.codacta]
    );

    if (pendingPartidos.length === 0) return;

    pendingPartidos.forEach(async (p) => {
      try {
        const acta = await fetchActaPartido(p.codacta);
        if (isCurrent && acta && (acta.equipo_local || acta.equipo_visitante)) {
          setMatchOverrides((prev) => ({
            ...prev,
            [p.codacta]: {
              local: acta.equipo_local || p.nombre_equipo_casa,
              visitante: acta.equipo_visitante || p.nombre_equipo_fuera,
              golesCasa: acta.goles_local,
              golesFuera: acta.goles_visitante,
            },
          }));
        }
      } catch {
        // Si no hay acta oficial publicada (partido futuro sin borrador arbitral), se mantiene el nombre base
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [filteredPartidos, matchOverrides]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="p-5 pb-4 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white tracking-tight truncate">
                  {campoData?.nombre_campo || nombreCampoFallback || 'Instalación Deportiva'}
                </h3>
                {campoData?.direccion && (
                  <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                    <span>{campoData.direccion}</span>
                    {campoData.localidad && <span>• {campoData.localidad}</span>}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Badges de instalación y cómo llegar */}
          {campoData && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/60 text-[11px]">
              {campoData.superficie_juego && (
                <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {campoData.superficie_juego}
                </span>
              )}
              {campoData.tipo_campo && (
                <span className="bg-emerald-950/60 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
                  {campoData.tipo_campo}
                </span>
              )}
              {campoData.direccion && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${campoData.nombre_campo} ${campoData.direccion} ${campoData.localidad || 'Madrid'}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 rounded-full transition-colors ml-auto font-medium"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Cómo llegar</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Selector horizontal de fechas / días */}
        {!isLoading && !error && availableDates.length > 0 && (
          <div
            ref={dateScrollContainerRef}
            className="px-5 py-2.5 border-b border-slate-800/60 bg-slate-950/40 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-2"
          >
            <button
              type="button"
              data-active={activeDate === 'all'}
              onClick={() => setActiveDate('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeDate === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>Todos los partidos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">
                {campoData?.total_partidos || 0}
              </span>
            </button>

            {availableDates.map(([dStr, count]) => {
              const isSelected = activeDate === dStr;
              const now = new Date();
              const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              const isToday = dStr === todayStr;

              return (
                <button
                  key={dStr}
                  type="button"
                  data-active={isSelected}
                  onClick={() => setActiveDate(dStr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span className="capitalize">{formatDateLabel(dStr)}</span>
                  {isToday && (
                    <span
                      className={`text-[9px] uppercase px-1 py-0.5 rounded font-black tracking-wider ${
                        isSelected
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      Hoy
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Cuerpo / Lista de partidos */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-14 space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs text-slate-400">Consultando agenda oficial de la instalación...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
              <p className="text-xs text-red-300 font-medium">{error}</p>
            </div>
          )}

          {!isLoading && !error && filteredPartidos.length === 0 && (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-medium">No hay partidos programados para la fecha seleccionada.</p>
            </div>
          )}

          {!isLoading && !error && filteredPartidos.length > 0 && (
            <div className="space-y-2.5">
              {filteredPartidos.map((partido, idx) => {
                const override = partido.codacta ? matchOverrides[partido.codacta] : undefined;
                const localName = override?.local || partido.nombre_equipo_casa;
                const visitorName = override?.visitante || partido.nombre_equipo_fuera;
                const golesCasa = override?.golesCasa !== undefined ? override.golesCasa : partido.goles_casa;
                const golesFuera = override?.golesFuera !== undefined ? override.golesFuera : partido.goles_fuera;

                const hasScore =
                  golesCasa != null &&
                  golesCasa !== '' &&
                  golesFuera != null &&
                  golesFuera !== '';

                return (
                  <div
                    key={`${partido.codacta}_${idx}`}
                    onClick={() => {
                      if (onSelectActa && partido.codacta) {
                        onSelectActa(partido.codacta);
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-850/60 transition-all cursor-pointer group"
                  >
                    {/* Fila superior: Hora y Competición */}
                    <div className="flex items-center justify-between text-[11px] mb-2 pb-2 border-b border-slate-800/60">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(partido.fecha)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400 truncate max-w-[240px]">
                        <Trophy className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate font-medium text-slate-300">
                          {partido.nombre_competicion || 'Competición'}
                        </span>
                        {partido.nombre_grupo && (
                          <span className="text-slate-500 text-[10px] shrink-0">
                            • {partido.nombre_grupo}
                          </span>
                        )}
                        {partido.jornada && (
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            (J{partido.jornada})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila de Equipos y Marcador */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      {/* Local */}
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                          {fixEscudo(partido.escudo_equipo_casa) ? (
                            <img
                              src={fixEscudo(partido.escudo_equipo_casa)!}
                              alt={localName}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                          {localName}
                        </span>
                      </div>

                      {/* Marcador Central */}
                      <div className="col-span-2 flex justify-center">
                        {hasScore ? (
                          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg text-xs font-extrabold text-white">
                            <span>{golesCasa}</span>
                            <span className="text-slate-600">:</span>
                            <span>{golesFuera}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-900/90 border border-slate-800/80 px-1.5 py-0.5 rounded">
                            VS
                          </span>
                        )}
                      </div>

                      {/* Visitante */}
                      <div className="col-span-5 flex items-center justify-end gap-2 min-w-0 text-right">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                          {visitorName}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                          {fixEscudo(partido.escudo_equipo_fuera) ? (
                            <img
                              src={fixEscudo(partido.escudo_equipo_fuera)!}
                              alt={visitorName}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
