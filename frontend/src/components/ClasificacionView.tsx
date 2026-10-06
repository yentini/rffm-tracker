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

  /**
 * Insignia visual para la racha de los últimos partidos:
 * V (Victoria, verde), E (Empate, ámbar), D (Derrota, rojo).
 */
  const getRachaBadge = (tipo: string, color?: string, itemKey?: string) => {
    const raw = (tipo || '').toUpperCase().trim();
    let letter = 'V';
    let label = 'Victoria';
    let bg = '#10b981'; // emerald-500

    if (raw === 'E') {
      letter = 'E';
      label = 'Empate';
      bg = '#f59e0b'; // amber-500
    } else if (raw === 'P' || raw === 'D') {
      letter = 'D';
      label = 'Derrota';
      bg = '#ef4444'; // rose-500
    } else if (raw === 'G' || raw === 'V') {
      letter = 'V';
      label = 'Victoria';
      bg = '#10b981';
    } else if (color) {
      bg = color;
    }

    return (
      <span
        key={itemKey}
        style={{ backgroundColor: bg }}
        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm ring-1 ring-white/20 select-none"
        title={`Resultado: ${label}`}
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
          {/* Cabecera y tabla con scroll horizontal optimizado */}
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 whitespace-nowrap">
                  <th className="py-2.5 pl-3 pr-1 w-9 text-center">Pos</th>
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
                      <th className="py-2.5 pr-3 pl-2 text-center min-w-[92px]">Racha (Últ. 5)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans whitespace-nowrap">
                {clasificacionData.clasificacion.map((equipo: ClasificacionEquipo) => {
                  const isFav = favoriteTeamCodes.includes(equipo.codequipo);
                  const posNum = parseInt(equipo.posicion, 10);
                  const promocion = clasificacionData.promociones.find(
                    (p) =>
                      equipo.color &&
                      p.color_promocion.toLowerCase() === equipo.color.toLowerCase()
                  );
                  const promoColor = equipo.color || promocion?.color_promocion;

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
                      style={
                        promoColor
                          ? { borderLeft: `3.5px solid ${promoColor}` }
                          : { borderLeft: '3.5px solid transparent' }
                      }
                      className={`hover:bg-slate-800/60 active:bg-slate-800/90 cursor-pointer transition-colors ${
                        isFav ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Posición destacada con badge de zona */}
                      <td className="py-2.5 pl-2.5 pr-1 text-center font-mono text-[11px] font-bold">
                        <span
                          style={
                            promoColor
                              ? {
                                  backgroundColor: `${promoColor}22`,
                                  color: promoColor,
                                  borderColor: `${promoColor}55`,
                                }
                              : undefined
                          }
                          className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-lg border ${
                            promoColor
                              ? ''
                              : posNum <= 3
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-slate-950/60 text-slate-300 border-slate-800'
                          }`}
                        >
                          {equipo.posicion}
                        </span>
                      </td>

                      {/* Escudo y Nombre del Equipo */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2 max-w-[150px] sm:max-w-[220px]">
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
                          {/* Racha visual con V/E/D */}
                          <td className="py-2.5 pr-3 pl-2">
                            <div className="flex items-center justify-center gap-1">
                              {equipo.racha_partidos && equipo.racha_partidos.length > 0 ? (
                                equipo.racha_partidos
                                  .slice(-5)
                                  .map((r, rIdx) =>
                                    getRachaBadge(
                                      r.tipo,
                                      r.color,
                                      `${equipo.codequipo}-racha-${rIdx}`
                                    )
                                  )
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

          {/* Leyenda de Promociones y Racha */}
          <div className="p-3.5 bg-slate-950/80 border-t border-slate-800/80 space-y-2 text-xs">
            {/* Zonas de Clasificación */}
            {clasificacionData.promociones && clasificacionData.promociones.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Zonas:
                </span>
                {clasificacionData.promociones.map((prom) => {
                  const equiposDeZona = clasificacionData.clasificacion.filter(
                    (eq) => eq.color && eq.color.toLowerCase() === prom.color_promocion.toLowerCase()
                  );
                  const posIni = equiposDeZona[0]?.posicion;
                  const posFin = equiposDeZona[equiposDeZona.length - 1]?.posicion;
                  const rango = posIni
                    ? posIni === posFin
                      ? `(${posIni}º)`
                      : `(${posIni}º - ${posFin}º)`
                    : '';

                  return (
                    <div
                      key={prom.orden}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                    >
                      <span
                        style={{ backgroundColor: prom.color_promocion }}
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                      />
                      <span className="font-medium text-slate-200">{prom.nombre_promocion}</span>
                      {rango && (
                        <span className="text-[10px] font-mono text-slate-500">{rango}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Leyenda de Racha y Ayuda de Interacción */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/50 text-[10px] text-slate-500">
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-slate-400">Forma:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Victoria (V)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Empate (E)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Derrota (D)
                </span>
              </div>
              <span className="italic text-slate-500 hidden sm:inline">
                Toca cualquier equipo para ver su plantilla
              </span>
            </div>
          </div>
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
