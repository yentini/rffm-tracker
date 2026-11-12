import React, { useState } from 'react';
import { Season, GameType, Competition, Group, EquipoGrupo, DeduceTeamResult } from '../types';
import {
  Calendar,
  Trophy,
  ChevronDown,
  Layers,
  Award,
  Users2,
  Shield,
  Loader2,
  Star,
  Sparkles,
  X,
} from 'lucide-react';
import { QuickTeamSearch } from './QuickTeamSearch';

interface CompetitionSelectorProps {
  seasons: Season[];
  gameTypes: GameType[];
  competitions: Competition[];
  groups: Group[];
  teams: EquipoGrupo[];
  selectedSeason: string;
  selectedGameType: string;
  selectedCompetition: string;
  selectedGroup: string;
  selectedTeam: string;
  onSeasonChange: (seasonId: string) => void;
  onGameTypeChange: (gameTypeId: string) => void;
  onCompetitionChange: (competitionId: string) => void;
  onGroupChange: (groupId: string) => void;
  onTeamChange: (teamId: string) => void;
  isLoading: boolean;
  isLoadingCompetitions: boolean;
  isLoadingGroups: boolean;
  isCurrentFavorite?: boolean;
  onToggleFavorite?: () => void;
  onSelectDeduceTeam?: (team: DeduceTeamResult) => void;
  favoriteTeamCodes?: string[];
  onToggleFavoriteFromDeduce?: (team: DeduceTeamResult) => void;
}

export const CompetitionSelector: React.FC<CompetitionSelectorProps> = ({
  seasons,
  gameTypes,
  competitions,
  groups,
  teams,
  selectedSeason,
  selectedGameType,
  selectedCompetition,
  selectedGroup,
  selectedTeam,
  onSeasonChange,
  onGameTypeChange,
  onCompetitionChange,
  onGroupChange,
  onTeamChange,
  isLoading,
  isLoadingCompetitions,
  isLoadingGroups,
  isCurrentFavorite = false,
  onToggleFavorite,
  onSelectDeduceTeam,
  favoriteTeamCodes = [],
  onToggleFavoriteFromDeduce,
}) => {
  // Estado para acordeón: ambas cajas empiezan encogidas (null).
  // Al pulsar en una, se abre y cierra la otra si estuviera abierta.
  const [openBox, setOpenBox] = useState<'search' | 'filters' | null>(null);

  const toggleSearch = () => {
    setOpenBox((prev) => (prev === 'search' ? null : 'search'));
  };

  const toggleFilters = () => {
    setOpenBox((prev) => (prev === 'filters' ? null : 'filters'));
  };

  const handleSelectTeamFromSearch = (team: DeduceTeamResult) => {
    if (onSelectDeduceTeam) {
      onSelectDeduceTeam(team);
      setOpenBox(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* CAJA 1: Búsqueda Rápida de Equipo */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl shadow-black/40 backdrop-blur-md overflow-hidden transition-all">
        <button
          type="button"
          onClick={toggleSearch}
          className="w-full p-3 sm:p-4 flex items-center justify-between text-left transition-all hover:bg-slate-850/60 active:scale-[0.99] group"
          aria-expanded={openBox === 'search'}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600/30 to-amber-500/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
              <Sparkles className="w-4 h-4 text-red-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white group-hover:text-red-400 transition-colors truncate">
                Búsqueda Rápida de Equipo
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Deduce liga, grupo y calendario por nombre
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full hidden xs:inline-block">
              {openBox === 'search' ? 'Cerrar' : 'Buscar'}
            </span>
            <div
              className={`w-7 h-7 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 transition-transform duration-200 ${
                openBox === 'search' ? 'rotate-180 bg-red-600/20 text-red-400' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {openBox === 'search' && (
          <div className="px-3.5 pb-4 sm:px-5 sm:pb-5 border-t border-slate-800/80 animate-in fade-in duration-200">
            <QuickTeamSearch
              onSelectTeam={handleSelectTeamFromSearch}
              favoriteTeamCodes={favoriteTeamCodes}
              onToggleFavorite={onToggleFavoriteFromDeduce}
              selectedTeamCode={selectedTeam}
            />
          </div>
        )}
      </div>

      {/* CAJA 2: Filtros de Competición */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl shadow-black/40 backdrop-blur-md overflow-hidden transition-all">
        <button
          type="button"
          onClick={toggleFilters}
          className="w-full p-3 sm:p-4 flex items-center justify-between text-left transition-all hover:bg-slate-850/60 active:scale-[0.99] group"
          aria-expanded={openBox === 'filters'}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                Filtros de Competición
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Temporada, modalidad, categoría y grupo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {competitions.length > 0 && !isLoadingCompetitions && (
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 hidden sm:inline-block">
                {competitions.length} ligas
              </span>
            )}
            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full hidden xs:inline-block">
              {openBox === 'filters' ? 'Cerrar' : 'Filtrar'}
            </span>
            <div
              className={`w-7 h-7 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 transition-transform duration-200 ${
                openBox === 'filters' ? 'rotate-180 bg-blue-600/20 text-blue-400' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {openBox === 'filters' && (
          <div className="px-3.5 pb-4 sm:px-5 sm:pb-5 border-t border-slate-800/80 space-y-3 sm:space-y-4 pt-3.5 animate-in fade-in duration-200">
            {isLoading ? (
              <div className="space-y-3 py-2">
                <div className="h-12 bg-slate-800/60 rounded-2xl animate-pulse" />
                <div className="h-12 bg-slate-800/60 rounded-2xl animate-pulse" />
                <div className="h-12 bg-slate-800/60 rounded-2xl animate-pulse" />
              </div>
            ) : (
              <>
                {/* Desplegable 1: Temporada */}
                <div className="space-y-1 sm:space-y-1.5">
                  <label
                    htmlFor="select-temporada"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 ml-1"
                  >
                    <Calendar className="w-3.5 h-3.5 text-red-400" />
                    <span>Temporada</span>
                  </label>

                  <div className="relative">
                    <select
                      id="select-temporada"
                      value={selectedSeason}
                      onChange={(e) => onSeasonChange(e.target.value)}
                      className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 text-white text-xs sm:text-sm font-medium rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all cursor-pointer shadow-inner"
                    >
                      <option value="" disabled>Selecciona una temporada...</option>
                      {seasons.map((season) => (
                        <option key={season.cod_temporada} value={season.cod_temporada} className="bg-slate-900 text-white">
                          {season.nombre}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Desplegable 2: Tipo de Fútbol / Modalidad */}
                <div className="space-y-1 sm:space-y-1.5">
                  <label
                    htmlFor="select-game-type"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 ml-1"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Modalidad / Tipo de Fútbol</span>
                  </label>

                  <div className="relative">
                    <select
                      id="select-game-type"
                      value={selectedGameType}
                      onChange={(e) => onGameTypeChange(e.target.value)}
                      className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 text-white text-xs sm:text-sm font-medium rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all cursor-pointer shadow-inner"
                    >
                      <option value="" disabled>Selecciona una modalidad...</option>
                      {gameTypes.map((gameType) => (
                        <option key={gameType.codigo_tipo_juego} value={gameType.codigo_tipo_juego} className="bg-slate-900 text-white">
                          {gameType.nombre}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Desplegable 3: Competición */}
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label
                      htmlFor="select-competition"
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"
                    >
                      <Award className="w-3.5 h-3.5 text-blue-400" />
                      <span>Competición / Categoría</span>
                    </label>
                    {isLoadingCompetitions && (
                      <div className="flex items-center gap-1 text-[11px] text-blue-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Cargando...</span>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      id="select-competition"
                      value={selectedCompetition}
                      disabled={isLoadingCompetitions || competitions.length === 0}
                      onChange={(e) => onCompetitionChange(e.target.value)}
                      className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 text-white text-xs sm:text-sm font-medium rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingCompetitions ? (
                        <option value="" disabled>Cargando competiciones disponibles...</option>
                      ) : competitions.length === 0 ? (
                        <option value="" disabled>No hay competiciones para estos filtros</option>
                      ) : (
                        <>
                          <option value="" disabled>Selecciona una competición...</option>
                          {competitions.map((competition) => (
                            <option
                              key={competition.codigo}
                              value={competition.codigo}
                              className="bg-slate-900 text-white"
                            >
                              {competition.nombre}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Desplegable 4: Grupo de la Competición */}
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label
                      htmlFor="select-group"
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"
                    >
                      <Users2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Grupo / Subgrupo</span>
                    </label>
                    {isLoadingGroups && (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Cargando grupos...</span>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      id="select-group"
                      value={selectedGroup}
                      disabled={isLoadingGroups || groups.length === 0 || !selectedCompetition}
                      onChange={(e) => onGroupChange(e.target.value)}
                      className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 text-white text-xs sm:text-sm font-medium rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingGroups ? (
                        <option value="" disabled>Cargando grupos de la competición...</option>
                      ) : groups.length === 0 ? (
                        <option value="" disabled>
                          {selectedCompetition ? 'No hay grupos configurados' : 'Selecciona primero una competición'}
                        </option>
                      ) : (
                        <>
                          <option value="" disabled>Selecciona un grupo...</option>
                          {groups.map((group) => (
                            <option
                              key={group.codigo}
                              value={group.codigo}
                              className="bg-slate-900 text-white"
                            >
                              {group.nombre}
                              {group.total_equipos ? ` (${group.total_equipos} eq` : ''}
                              {group.total_jornadas ? `, ${group.total_jornadas} jor)` : group.total_equipos ? ')' : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Desplegable 5: Equipo del Grupo */}
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label
                      htmlFor="select-team"
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"
                    >
                      <Shield className="w-3.5 h-3.5 text-rose-400" />
                      <span>Equipo (opcional)</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        id="select-team"
                        value={selectedTeam}
                        disabled={!selectedGroup || teams.length === 0}
                        onChange={(e) => onTeamChange(e.target.value)}
                        className={`w-full appearance-none bg-slate-950/80 border text-white text-xs sm:text-sm font-medium rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3.5 pr-10 focus:outline-none focus:ring-2 transition-all cursor-pointer shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${
                          selectedTeam
                            ? 'border-rose-500/60 focus:ring-rose-500/50 focus:border-rose-500 bg-rose-950/20'
                            : 'border-slate-700/80 focus:ring-rose-500/50 focus:border-rose-500'
                        }`}
                      >
                        <option value="">
                          {!selectedGroup ? 'Selecciona primero un grupo' : 'Todos los equipos (ver jornadas)'}
                        </option>
                        {teams.map((team) => (
                          <option key={team.codigo} value={team.codigo} className="bg-slate-900 text-white">
                            {team.nombre}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Botón de deselección de equipo */}
                    {selectedTeam && (
                      <button
                        type="button"
                        onClick={() => onTeamChange('')}
                        title="Deseleccionar equipo y ver todas las jornadas"
                        aria-label="Deseleccionar equipo"
                        className="p-2.5 sm:p-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}

                    {/* Botón de estrella para favoritos */}
                    <button
                      type="button"
                      onClick={onToggleFavorite}
                      disabled={!selectedTeam}
                      title={
                        !selectedTeam
                          ? 'Selecciona un equipo para guardarlo en favoritos'
                          : isCurrentFavorite
                          ? 'Quitar de tus equipos favoritos'
                          : 'Guardar como equipo favorito en caché'
                      }
                      className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-center shrink-0 ${
                        !selectedTeam
                          ? 'bg-slate-950/40 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                          : isCurrentFavorite
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30 active:scale-95 shadow-lg shadow-amber-500/10'
                          : 'bg-slate-950/80 border-slate-700/80 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 active:scale-95'
                      }`}
                    >
                      <Star
                        className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                          isCurrentFavorite ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'hover:scale-110'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
