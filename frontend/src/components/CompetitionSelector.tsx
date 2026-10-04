import React from 'react';
import { Season, GameType, Competition, Group, EquipoGrupo } from '../types';
import { Calendar, Trophy, ChevronDown, Layers, Award, Users2, Shield, Loader2, Star, Sparkles } from 'lucide-react';

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
  onOpenSmartSearch?: () => void;
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
  onOpenSmartSearch,
}) => {

  return (
    <div className="space-y-4">
      {/* Tarjeta de Contenedor de Desplegables */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl shadow-black/40 backdrop-blur-md">
        
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Filtros de Competición</h2>
              <p className="text-xs text-slate-400">Datos oficiales en directo desde la RFFM</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {competitions.length > 0 && !isLoadingCompetitions && (
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                {competitions.length} ligas
              </span>
            )}
            {groups.length > 0 && !isLoadingGroups && (
              <span className="text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800/40">
                {groups.length} grupos
              </span>
            )}
          </div>
        </div>

        {/* Botón de Acceso Rápido / Búsqueda Mágica */}
        {onOpenSmartSearch && (
          <button
            type="button"
            onClick={onOpenSmartSearch}
            className="w-full mb-4 py-2.5 px-3.5 bg-gradient-to-r from-red-600/20 via-slate-800 to-amber-500/10 hover:from-red-600/30 hover:to-amber-500/20 active:scale-[0.99] border border-red-500/30 hover:border-red-500/50 rounded-2xl flex items-center justify-between text-xs transition-all shadow-md group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-sm shadow-red-900/50">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-slate-200 group-hover:text-white">
                Búsqueda Rápida de Equipo
              </span>
            </div>
            <span className="text-[10px] text-red-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700/60">
              Deducción automática
            </span>
          </button>
        )}

        {isLoading ? (
          <div className="space-y-4 py-3">
            <div className="h-14 bg-slate-800/60 rounded-2xl animate-pulse" />
            <div className="h-14 bg-slate-800/60 rounded-2xl animate-pulse" />
            <div className="h-14 bg-slate-800/60 rounded-2xl animate-pulse" />
            <div className="h-14 bg-slate-800/60 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Desplegable 1: Temporada */}
            <div className="space-y-1.5">
              <label 
                htmlFor="select-temporada" 
                className="flex items-center gap-2 text-xs font-semibold text-slate-300 ml-1"
              >
                <Calendar className="w-3.5 h-3.5 text-red-400" />
                <span>Temporada</span>
              </label>
              
              <div className="relative">
                <select
                  id="select-temporada"
                  value={selectedSeason}
                  onChange={(e) => onSeasonChange(e.target.value)}
                  className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium rounded-2xl px-4 py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all cursor-pointer shadow-inner"
                >
                  <option value="" disabled>Selecciona una temporada...</option>
                  {seasons.map((season) => (
                    <option key={season.cod_temporada} value={season.cod_temporada} className="bg-slate-900 text-white">
                      {season.nombre} {season.fecha_inicio ? `(${season.fecha_inicio.substring(0, 4)} - ${season.fecha_fin?.substring(0, 4) || ''})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Desplegable 2: Tipo de Fútbol */}
            <div className="space-y-1.5">
              <label 
                htmlFor="select-game-type" 
                className="flex items-center gap-2 text-xs font-semibold text-slate-300 ml-1"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Modalidad / Tipo de Fútbol</span>
              </label>

              <div className="relative">
                <select
                  id="select-game-type"
                  value={selectedGameType}
                  onChange={(e) => onGameTypeChange(e.target.value)}
                  className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium rounded-2xl px-4 py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all cursor-pointer shadow-inner"
                >
                  <option value="" disabled>Selecciona una modalidad...</option>
                  {gameTypes.map((gameType) => (
                    <option key={gameType.codigo_tipo_juego} value={gameType.codigo_tipo_juego} className="bg-slate-900 text-white">
                      {gameType.nombre} (Cód: {gameType.codigo_tipo_juego})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Desplegable 3: Competición */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label 
                  htmlFor="select-competition" 
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300"
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
                  className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium rounded-2xl px-4 py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
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
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Desplegable 4: Grupo de la Competición */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label 
                  htmlFor="select-group" 
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300"
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
                  className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium rounded-2xl px-4 py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
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
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Desplegable 5: Equipo del Grupo (opcional para filtro vertical continuo) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label 
                  htmlFor="select-team" 
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300"
                >
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  <span>Equipo (opcional)</span>
                </label>
                {selectedTeam && (
                  <button
                    type="button"
                    onClick={() => onTeamChange('')}
                    className="text-[10px] text-red-400 hover:text-red-300 underline"
                  >
                    Ver todos los equipos
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    id="select-team"
                    value={selectedTeam}
                    disabled={!selectedGroup || teams.length === 0}
                    onChange={(e) => onTeamChange(e.target.value)}
                    className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium rounded-2xl px-4 py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all cursor-pointer shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Todos los equipos (ver por jornadas)</option>
                    {teams.map((team) => (
                      <option key={team.codigo} value={team.codigo} className="bg-slate-900 text-white">
                        {team.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Botón interactivo de estrella para guardar/quitar de favoritos */}
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
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-center shrink-0 ${
                    !selectedTeam
                      ? 'bg-slate-950/40 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                      : isCurrentFavorite
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30 active:scale-95 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/80 border-slate-700/80 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 active:scale-95'
                  }`}
                >
                  <Star
                    className={`w-5 h-5 transition-transform ${
                      isCurrentFavorite ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'hover:scale-110'
                    }`}
                  />
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
