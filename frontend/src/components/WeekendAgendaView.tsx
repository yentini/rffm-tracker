import React, { useState, useEffect } from 'react';
import { FavoriteTeam, PartidoCalendario } from '../types';
import { fetchCalendario, fetchTeamCompetition } from '../services/api';
import { setFavoritesCache } from '../services/favorites';
import { saveCloudFavoriteTeams } from '../services/auth';
import {
  extractTeamWeekendMatches,
  processWeekendAgenda,
  WeekendMatchItem,
} from '../utils/weekendAgenda';
import {
  getGoogleMapsUrl,
  getGoogleCalendarUrl,
  downloadIcsFile,
} from '../utils/matchActions';
import {
  Calendar,
  Clock,
  MapPin,
  Navigation,
  CalendarPlus,
  Download,
  AlertTriangle,
  Loader2,
  Shield,
  Star,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface WeekendAgendaViewProps {
  favorites: FavoriteTeam[];
  onSelectMatch: (partido: PartidoCalendario) => void;
  onSelectCampo?: (codigoCampo?: string | null, nombreCampoFallback?: string | null) => void;
  onGoToMatches: () => void;
}

type DayFilter = 'todos' | 'sabado' | 'domingo' | 'otro';

export const WeekendAgendaView: React.FC<WeekendAgendaViewProps> = ({
  favorites,
  onSelectMatch,
  onSelectCampo,
  onGoToMatches,
}) => {
  const [matches, setMatches] = useState<WeekendMatchItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<DayFilter>('todos');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Carga reactiva de los calendarios de todos los equipos favoritos
  useEffect(() => {
    if (favorites.length === 0) {
      setMatches([]);
      return;
    }

    let isSubscribed = true;
    const loadAgenda = async () => {
      setIsLoading(true);

      try {
        let didAutoHeal = false;
        const updatedFavorites = [...favorites];

        const promises = favorites.map(async (fav, index) => {
          try {
            let seasonId = fav.seasonId || '22';
            let gameTypeId = fav.gameTypeId || '1';
            let competitionId = fav.competitionId;
            let groupId = fav.groupId;

            // Auto-resolución si falta el grupo o la competición
            if (!groupId || !groupId.trim() || !competitionId || !competitionId.trim()) {
              try {
                const deduced = await fetchTeamCompetition(fav.teamId);
                if (deduced.codigo_grupo) {
                  groupId = deduced.codigo_grupo;
                  competitionId = deduced.codigo_competicion || competitionId;
                  gameTypeId = deduced.codigo_tipo_juego || gameTypeId;
                  seasonId = deduced.codigo_temporada || seasonId;

                  updatedFavorites[index] = {
                    ...fav,
                    groupId,
                    groupName: deduced.nombre_grupo || fav.groupName,
                    competitionId,
                    competitionName: deduced.nombre_competicion || fav.competitionName,
                    gameTypeId,
                    seasonId,
                  };
                  didAutoHeal = true;
                }
              } catch (dedErr) {
                console.warn(`No se pudo deducir grupo para ${fav.teamName}:`, dedErr);
              }
            }

            const cal = await fetchCalendario(
              seasonId,
              gameTypeId,
              competitionId,
              groupId,
              fav.teamId
            );
            return extractTeamWeekendMatches(updatedFavorites[index], cal);
          } catch (err) {
            console.warn(`No se pudo cargar calendario para ${fav.teamName}:`, err);
            return [];
          }
        });

        const results = await Promise.all(promises);
        if (isSubscribed) {
          const allMatches = results.flat();
          const processed = processWeekendAgenda(allMatches);
          setMatches(processed);

          if (didAutoHeal) {
            setFavoritesCache(updatedFavorites);
            saveCloudFavoriteTeams(updatedFavorites).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Error al generar agenda del fin de semana:', err);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadAgenda();

    return () => {
      isSubscribed = false;
    };
  }, [favorites, refreshKey]);

  // Contadores por día
  const sabadoCount = matches.filter((m) => m.diaSemana === 'sabado').length;
  const domingoCount = matches.filter((m) => m.diaSemana === 'domingo').length;
  const otrosCount = matches.filter((m) => m.diaSemana === 'otro').length;

  // Filtrado actual
  const displayedMatches = matches.filter((m) => {
    if (activeFilter === 'todos') return true;
    return m.diaSemana === activeFilter;
  });

  return (
    <div className="space-y-4">
      {/* Filtros de día (Cápsulas Todos / Sábado / Domingo) */}
      {favorites.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-xl shadow-black/40 backdrop-blur-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
            <button
              onClick={() => setActiveFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'todos'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>Todos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                {matches.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('sabado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'sabado'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>Sábado</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                {sabadoCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('domingo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'domingo'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>Domingo</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                {domingoCount}
              </span>
            </button>

            {otrosCount > 0 && (
              <button
                onClick={() => setActiveFilter('otro')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeFilter === 'otro'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>Otro día</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                  {otrosCount}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-800/80">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={isLoading}
              title="Refrescar horarios"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Estados de Carga, Vacío o Lista de Partidos */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3 bg-slate-900/50 border border-slate-800 rounded-3xl">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">
            Comprobando los partidos del fin de semana para tus equipos...
          </p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 shadow-inner">
            <Star className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-white">No tienes equipos guardados</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Añade tus equipos favoritos (hijos, familiares o tu club) para ver de un solo vistazo
              quién juega el sábado, quién el domingo y en qué campos.
            </p>
          </div>
          <button
            onClick={onGoToMatches}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-rose-600/20 transition-all active:scale-95"
          >
            <span>Buscar Equipos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : displayedMatches.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-300">
            No hay partidos programados para este filtro
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {activeFilter !== 'todos'
              ? 'Prueba a seleccionar "Todos" para ver el resto de partidos de tus equipos.'
              : 'Tus equipos descansan esta jornada o la federación aún no ha publicado los horarios oficiales.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedMatches.map((m) => {
            const isSabado = m.diaSemana === 'sabado';
            const isDomingo = m.diaSemana === 'domingo';
            const hasScore = m.golesLocal !== null && m.golesLocal !== undefined;

            return (
              <div
                key={m.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md space-y-3 hover:border-slate-700/80 transition-all"
              >
                {/* Cabecera de la tarjeta: Día, Fecha, Hora y Jornada */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-xs ${
                        isSabado
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : isDomingo
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {m.diaSemanaNombre}
                    </span>

                    <span className="text-[11px] font-medium text-slate-400">
                      {m.fechaFormateada}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{m.hora}</span>
                    </span>

                    <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                      J{m.jornadaNum}
                    </span>
                  </div>
                </div>

                {/* Banner de Identificación: Tu Equipo Favorito */}
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/70 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="font-bold text-white truncate">{m.favTeamName}</span>
                    {m.categoryName && (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/25 text-[10px] font-semibold shrink-0">
                        {m.categoryName}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 shrink-0">
                      ({m.isLocal ? 'Local' : 'Visitante'})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate max-w-[140px] sm:max-w-[200px] hidden xs:inline sm:inline">
                    {m.competitionName}
                  </span>
                </div>

                {/* Alerta de Conflicto Horario si coincide con otro de tus equipos */}
                {m.hasTimeConflict && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">{m.conflictDescription}</span>
                  </div>
                )}

                {/* Enfrentamiento deportivo: Local vs Visitante */}
                <div className="grid grid-cols-7 items-center gap-2 py-1 text-center">
                  {/* Local */}
                  <div className="col-span-3 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl p-1.5 flex items-center justify-center border shadow-inner ${
                        m.isLocal
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {m.escudoLocal ? (
                        <img
                          src={m.escudoLocal}
                          alt={m.equipoLocal}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <Shield className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold line-clamp-2 leading-tight ${
                        m.isLocal ? 'text-amber-300' : 'text-slate-200'
                      }`}
                    >
                      {m.equipoLocal}
                    </span>
                  </div>

                  {/* Marcador o VS */}
                  <div className="col-span-1 flex flex-col items-center justify-center">
                    {hasScore ? (
                      <div className="flex items-center gap-1 font-mono font-black text-lg text-white">
                        <span>{m.golesLocal}</span>
                        <span className="text-slate-600">-</span>
                        <span>{m.golesVisitante}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-black text-slate-500">VS</span>
                    )}
                  </div>

                  {/* Visitante */}
                  <div className="col-span-3 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl p-1.5 flex items-center justify-center border shadow-inner ${
                        !m.isLocal
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {m.escudoVisitante ? (
                        <img
                          src={m.escudoVisitante}
                          alt={m.equipoVisitante}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <Shield className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold line-clamp-2 leading-tight ${
                        !m.isLocal ? 'text-amber-300' : 'text-slate-200'
                      }`}
                    >
                      {m.equipoVisitante}
                    </span>
                  </div>
                </div>

                {/* Sede deportiva / Campo */}
                {m.campo && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectCampo && onSelectCampo(m.codigoCampo, m.campo)
                      }
                      className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white truncate max-w-full text-left group"
                      title={`Ver agenda de ${m.campo}`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate underline decoration-dotted underline-offset-2">
                        {m.campo}
                      </span>
                    </button>
                  </div>
                )}

                {/* Barra de Acciones del Partido: En una sola fila */}
                <div className={`pt-2 border-t border-slate-800/60 grid ${m.campo ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 w-full`}>
                  {m.campo && (
                    <a
                      href={getGoogleMapsUrl(m.campo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] sm:text-[11px] font-semibold border border-slate-700/80 transition-all active:scale-95 shadow-sm truncate min-w-0"
                      title="Abrir ubicación en Google Maps"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        <span className="hidden xs:inline sm:inline">Cómo </span>llegar
                      </span>
                    </a>
                  )}

                  <a
                    href={getGoogleCalendarUrl({
                      local: m.equipoLocal,
                      visitante: m.equipoVisitante,
                      fecha: m.fechaRaw,
                      hora: m.hora,
                      campo: m.campo,
                      competicion: m.competitionName,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] sm:text-[11px] font-semibold border border-slate-700/80 transition-all active:scale-95 shadow-sm truncate min-w-0"
                    title="Añadir a Google Calendar"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">Google Cal</span>
                  </a>

                  {m.codacta ? (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectMatch({
                          codacta: m.codacta,
                          equipo_local: m.equipoLocal,
                          equipo_visitante: m.equipoVisitante,
                          escudo_equipo_local: m.escudoLocal,
                          escudo_equipo_visitante: m.escudoVisitante,
                          goles_local: m.golesLocal,
                          goles_visitante: m.golesVisitante,
                          fecha: m.fechaRaw,
                          hora: m.hora,
                          campo: m.campo,
                        })
                      }
                      className="flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] sm:text-[11px] font-semibold border border-slate-700/80 transition-all active:scale-95 shadow-sm truncate min-w-0"
                      title="Ver acta oficial o ficha del partido"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">Ver Ficha</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        downloadIcsFile({
                          local: m.equipoLocal,
                          visitante: m.equipoVisitante,
                          fecha: m.fechaRaw,
                          hora: m.hora,
                          campo: m.campo,
                          competicion: m.competitionName,
                        })
                      }
                      className="flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] sm:text-[11px] font-semibold border border-slate-700/80 transition-all active:scale-95 shadow-sm truncate min-w-0"
                      title="Descargar archivo de calendario .ics"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">.ics</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
