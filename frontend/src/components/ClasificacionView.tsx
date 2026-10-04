import React, { useState, useEffect } from 'react';
import {
  ClasificacionResponse,
  ClasificacionEquipo,
  Season,
  GameType,
  Competition,
  Group,
  TeamDetail,
} from '../types';
import { fetchClasificacion, fetchTeamDetail } from '../services/api';
import { TeamDetailModal } from './TeamDetailModal';
import {
  Trophy,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Shield,
  Calendar,
} from 'lucide-react';

interface ClasificacionViewProps {
  seasons: Season[];
  gameTypes: GameType[];
  competitions: Competition[];
  groups: Group[];
  selectedSeason: string;
  selectedGameType: string;
  selectedCompetition: string;
  selectedGroup: string;
  onSeasonChange: (seasonId: string) => void;
  onGameTypeChange: (gameTypeId: string) => void;
  onCompetitionChange: (competitionId: string) => void;
  onGroupChange: (groupId: string) => void;
  isLoadingCompetitions?: boolean;
  isLoadingGroups?: boolean;
  favoriteTeamCodes?: string[];
}

type TabScope = 'general' | 'casa' | 'fuera';

export const ClasificacionView: React.FC<ClasificacionViewProps> = ({
  seasons,
  gameTypes,
  competitions,
  groups,
  selectedSeason,
  selectedGameType,
  selectedCompetition,
  selectedGroup,
  onSeasonChange,
  onGameTypeChange,
  onCompetitionChange,
  onGroupChange,
  isLoadingCompetitions = false,
  isLoadingGroups = false,
  favoriteTeamCodes = [],
}) => {
  const [selectedJornada, setSelectedJornada] = useState<string>('1');
  const [clasificacionData, setClasificacionData] = useState<ClasificacionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tabScope, setTabScope] = useState<TabScope>('general');

  // Estado para el modal de detalle del equipo
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | null>(null);
  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);
  const [isTeamLoading, setIsTeamLoading] = useState<boolean>(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Al cambiar competición o grupo, reiniciar jornada
  useEffect(() => {
    setSelectedJornada('1');
  }, [selectedCompetition, selectedGroup]);

  // Carga reactiva de la clasificación
  useEffect(() => {
    if (!selectedSeason || !selectedGameType || !selectedCompetition || !selectedGroup) {
      setClasificacionData(null);
      return;
    }

    let isSubscribed = true;
    const loadClasificacion = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchClasificacion(
          selectedSeason,
          selectedGameType,
          selectedCompetition,
          selectedGroup,
          selectedJornada
        );

        if (isSubscribed) {
          setClasificacionData(data);
          // Si es la carga inicial de un grupo y tenemos current_round, sincronizar si aún estábamos en '1'
          if (data.current_round && selectedJornada === '1' && String(data.current_round) !== '1') {
            setSelectedJornada(String(data.current_round));
          }
        }
      } catch (err) {
        if (isSubscribed) {
          console.error('Error al cargar clasificación:', err);
          setError('No se pudo obtener la clasificación para esta jornada desde la RFFM.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadClasificacion();

    return () => {
      isSubscribed = false;
    };
  }, [selectedSeason, selectedGameType, selectedCompetition, selectedGroup, selectedJornada]);

  // Manejo de cambio de jornada previo / siguiente
  const jornadasDisponibles = clasificacionData?.jornadas_disponibles || [];
  const currentJornadaIndex = jornadasDisponibles.findIndex(
    (j) => j.codjornada === selectedJornada
  );

  const handlePrevJornada = () => {
    if (currentJornadaIndex > 0) {
      setSelectedJornada(jornadasDisponibles[currentJornadaIndex - 1].codjornada);
    } else {
      const prevNum = Math.max(1, parseInt(selectedJornada, 10) - 1);
      setSelectedJornada(String(prevNum));
    }
  };

  const handleNextJornada = () => {
    if (currentJornadaIndex >= 0 && currentJornadaIndex < jornadasDisponibles.length - 1) {
      setSelectedJornada(jornadasDisponibles[currentJornadaIndex + 1].codjornada);
    } else {
      const nextNum = parseInt(selectedJornada, 10) + 1;
      setSelectedJornada(String(nextNum));
    }
  };

  // Abrir detalle del equipo
  const handleOpenTeam = async (codigoEquipo: string) => {
    setSelectedTeamCode(codigoEquipo);
    setIsTeamLoading(true);
    setTeamError(null);
    try {
      const detail = await fetchTeamDetail(codigoEquipo);
      setTeamDetail(detail);
    } catch (err) {
      console.error('Error al abrir detalle del equipo:', err);
      setTeamError('No se pudo cargar la plantilla y datos del equipo.');
    } finally {
      setIsTeamLoading(false);
    }
  };

  const handleCloseTeam = () => {
    setSelectedTeamCode(null);
    setTeamDetail(null);
    setTeamError(null);
  };

  const getRachaBadge = (tipo: string, color?: string) => {
    const letter = tipo.toUpperCase();
    let bg = color || '#64748b';
    if (letter === 'G') bg = '#16a34a'; // verde
    if (letter === 'E') bg = '#ca8a04'; // amarillo/ámbar
    if (letter === 'P') bg = '#dc2626'; // rojo

    return (
      <span
        key={Math.random()}
        style={{ backgroundColor: bg }}
        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm"
        title={`Partido: ${letter === 'G' ? 'Ganado' : letter === 'E' ? 'Empatado' : 'Perdido'}`}
      >
        {letter}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. SELECTORES DE COMPETICIÓN Y GRUPO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Clasificación Oficial RFFM
          </h2>
        </div>

        {/* Fila 1: Temporada y Modalidad */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 mb-1 block">
              Temporada
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => onSeasonChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
            >
              {seasons.map((s) => (
                <option key={s.cod_temporada} value={s.cod_temporada}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 mb-1 block">
              Modalidad
            </label>
            <select
              value={selectedGameType}
              onChange={(e) => onGameTypeChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
            >
              {gameTypes.map((gt) => (
                <option key={gt.codigo_tipo_juego} value={gt.codigo_tipo_juego}>
                  {gt.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 2: Competición */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span>Competición</span>
            {isLoadingCompetitions && <Loader2 className="w-3 h-3 animate-spin text-red-500" />}
          </label>
          <select
            value={selectedCompetition}
            onChange={(e) => onCompetitionChange(e.target.value)}
            disabled={isLoadingCompetitions || competitions.length === 0}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50 truncate"
          >
            {competitions.length === 0 ? (
              <option value="">Sin competiciones</option>
            ) : (
              competitions.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Fila 3: Grupo */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span>Grupo</span>
            {isLoadingGroups && <Loader2 className="w-3 h-3 animate-spin text-red-500" />}
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => onGroupChange(e.target.value)}
            disabled={isLoadingGroups || groups.length === 0}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
          >
            {groups.length === 0 ? (
              <option value="">Selecciona una competición</option>
            ) : (
              groups.map((g) => (
                <option key={g.codigo} value={g.codigo}>
                  {g.nombre}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* 2. CONTROL DE JORNADA Y FILTRO DE ÁMBITO (GENERAL / CASA / FUERA) */}
      {selectedGroup && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3.5 shadow-xl backdrop-blur-md space-y-3">
          {/* Navegación por Jornadas */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePrevJornada}
              disabled={isLoading || (currentJornadaIndex <= 0 && parseInt(selectedJornada, 10) <= 1)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-slate-300 transition-all"
              aria-label="Jornada anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-black uppercase text-white tracking-wide">
                  Jornada {selectedJornada}
                </span>
                {clasificacionData?.current_round &&
                  String(clasificacionData.current_round) === selectedJornada && (
                    <span className="text-[9px] bg-red-600/30 text-red-400 font-bold px-1.5 py-0.2 rounded-full border border-red-500/40">
                      Actual
                    </span>
                  )}
              </div>
              {clasificacionData?.fecha_jornada && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {clasificacionData.fecha_jornada}
                </span>
              )}
            </div>

            <button
              onClick={handleNextJornada}
              disabled={
                isLoading ||
                (jornadasDisponibles.length > 0 &&
                  currentJornadaIndex >= jornadasDisponibles.length - 1)
              }
              className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-slate-300 transition-all"
              aria-label="Jornada siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Carrusel / Pills de Jornadas Disponibles */}
          {jornadasDisponibles.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5">
              {jornadasDisponibles.map((j) => {
                const isSelected = j.codjornada === selectedJornada;
                const isCurrent =
                  clasificacionData?.current_round &&
                  String(clasificacionData.current_round) === j.codjornada;

                return (
                  <button
                    key={j.codjornada}
                    onClick={() => setSelectedJornada(j.codjornada)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-md shadow-red-900/40 ring-1 ring-red-400'
                        : isCurrent
                        ? 'bg-slate-800 text-red-400 border border-red-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    J{j.nombre || j.codjornada}
                  </button>
                );
              })}
            </div>
          )}

          {/* Pestañas de Ámbito: General / Casa / Fuera */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setTabScope('general')}
              className={`flex-1 py-1 text-center rounded-xl text-xs font-bold transition-all ${
                tabScope === 'general'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setTabScope('casa')}
              className={`flex-1 py-1 text-center rounded-xl text-xs font-bold transition-all ${
                tabScope === 'casa'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Local
            </button>
            <button
              onClick={() => setTabScope('fuera')}
              className={`flex-1 py-1 text-center rounded-xl text-xs font-bold transition-all ${
                tabScope === 'fuera'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Visitante
            </button>
          </div>
        </div>
      )}

      {/* 3. TABLA DE CLASIFICACIÓN */}
      {isLoading ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-12 text-center shadow-xl flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-xs text-slate-400">Cargando clasificación de la RFFM...</p>
        </div>
      ) : error ? (
        <div className="bg-slate-900/90 border border-red-500/30 rounded-3xl p-6 text-center shadow-xl space-y-3">
          <AlertCircle className="w-7 h-7 text-red-500 mx-auto" />
          <p className="text-xs text-slate-300">{error}</p>
        </div>
      ) : !clasificacionData || clasificacionData.clasificacion.length === 0 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-2">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">
            No hay datos de clasificación disponibles para esta selección.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl overflow-hidden backdrop-blur-md">
          {/* Cabecera de la tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 pl-3 pr-1 w-8 text-center">Pos</th>
                  <th className="py-2.5 px-2">Equipo</th>
                  <th className="py-2.5 px-2 text-center font-black text-amber-400">PTS</th>
                  <th className="py-2.5 px-1.5 text-center">PJ</th>
                  <th className="py-2.5 px-1.5 text-center">PG</th>
                  <th className="py-2.5 px-1.5 text-center">PE</th>
                  <th className="py-2.5 px-1.5 text-center">PP</th>
                  {tabScope === 'general' && (
                    <>
                      <th className="py-2.5 px-1.5 text-center">GF</th>
                      <th className="py-2.5 px-1.5 text-center">GC</th>
                      <th className="py-2.5 px-2 text-center font-mono">DIF</th>
                      <th className="py-2.5 pr-3 pl-2 text-center">Racha</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {clasificacionData.clasificacion.map((equipo: ClasificacionEquipo) => {
                  const isFav = favoriteTeamCodes.includes(equipo.codequipo);
                  const colorAccent = equipo.color || 'transparent';

                  // Valores según el ámbito activo
                  const pts =
                    tabScope === 'general'
                      ? equipo.puntos
                      : tabScope === 'casa'
                      ? equipo.puntos_local || '0'
                      : equipo.puntos_visitante || '0';

                  const pj =
                    tabScope === 'general'
                      ? equipo.jugados
                      : tabScope === 'casa'
                      ? equipo.jugados_casa || '0'
                      : equipo.jugados_fuera || '0';

                  const pg =
                    tabScope === 'general'
                      ? equipo.ganados
                      : tabScope === 'casa'
                      ? equipo.ganados_casa || '0'
                      : equipo.ganados_fuera || '0';

                  const pe =
                    tabScope === 'general'
                      ? equipo.empatados
                      : tabScope === 'casa'
                      ? equipo.empatados_casa || '0'
                      : equipo.empatados_fuera || '0';

                  const pp =
                    tabScope === 'general'
                      ? equipo.perdidos
                      : tabScope === 'casa'
                      ? equipo.perdidos_casa || '0'
                      : equipo.perdidos_fuera || '0';

                  return (
                    <tr
                      key={equipo.codequipo}
                      onClick={() => handleOpenTeam(equipo.codequipo)}
                      className={`hover:bg-slate-800/50 active:bg-slate-800/80 cursor-pointer transition-colors ${
                        isFav ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Posición con barra de color de promoción */}
                      <td className="py-2.5 pl-3 pr-1 text-center font-mono text-[11px] font-bold relative">
                        {equipo.color && (
                          <span
                            style={{ backgroundColor: colorAccent }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r"
                          />
                        )}
                        <span
                          className={`inline-block ${
                            parseInt(equipo.posicion, 10) <= 3
                              ? 'text-amber-400 font-extrabold'
                              : 'text-slate-300'
                          }`}
                        >
                          {equipo.posicion}
                        </span>
                      </td>

                      {/* Escudo y Nombre del Equipo */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2 max-w-[150px] sm:max-w-[200px]">
                          {equipo.escudo ? (
                            <img
                              src={equipo.escudo}
                              alt={equipo.nombre}
                              className="w-5 h-5 object-contain shrink-0 rounded-sm"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Shield className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span
                            className={`truncate text-xs font-semibold ${
                              isFav ? 'text-amber-300' : 'text-slate-100'
                            }`}
                            title={equipo.nombre}
                          >
                            {equipo.nombre}
                          </span>
                        </div>
                      </td>

                      {/* Puntos destacados */}
                      <td className="py-2.5 px-2 text-center font-mono font-black text-amber-400 text-xs">
                        {pts}
                      </td>

                      {/* Partidos Jugados, Ganados, Empatados, Perdidos */}
                      <td className="py-2.5 px-1.5 text-center font-mono text-[11px] text-slate-300">
                        {pj}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-[11px] text-emerald-400">
                        {pg}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-[11px] text-slate-400">
                        {pe}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-[11px] text-rose-400">
                        {pp}
                      </td>

                      {/* Métricas exclusivas de la vista general */}
                      {tabScope === 'general' && (
                        <>
                          <td className="py-2.5 px-1.5 text-center font-mono text-[10px] text-slate-400">
                            {equipo.goles_a_favor}
                          </td>
                          <td className="py-2.5 px-1.5 text-center font-mono text-[10px] text-slate-400">
                            {equipo.goles_en_contra}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-center font-mono text-[10px] font-bold ${
                              equipo.diferencia_goles.startsWith('+')
                                ? 'text-emerald-400'
                                : equipo.diferencia_goles.startsWith('-')
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {equipo.diferencia_goles}
                          </td>
                          {/* Racha */}
                          <td className="py-2.5 pr-3 pl-2">
                            <div className="flex items-center justify-center gap-1">
                              {equipo.racha_partidos.length > 0 ? (
                                equipo.racha_partidos
                                  .slice(-5)
                                  .map((r) => getRachaBadge(r.tipo, r.color))
                              ) : (
                                <span className="text-[10px] text-slate-600">-</span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Leyenda de Promociones si existen */}
          {clasificacionData.promociones.length > 0 && (
            <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
              <span className="font-semibold text-slate-300">Zonas:</span>
              {clasificacionData.promociones.map((prom) => (
                <div key={prom.orden} className="flex items-center gap-1.5">
                  <span
                    style={{ backgroundColor: prom.color_promocion }}
                    className="w-2.5 h-2.5 rounded-full inline-block"
                  />
                  <span>{prom.nombre_promocion}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalle del Equipo al pulsar sobre un equipo de la tabla */}
      <TeamDetailModal
        isOpen={!!selectedTeamCode}
        onClose={handleCloseTeam}
        teamDetail={teamDetail}
        isLoading={isTeamLoading}
        error={teamError}
        onRetry={() => selectedTeamCode && handleOpenTeam(selectedTeamCode)}
      />
    </div>
  );
};
