import { useEffect, useState, useMemo } from 'react';
import { Header } from './components/Header';
import { CompetitionSelector } from './components/CompetitionSelector';
import { CalendarSlider } from './components/CalendarSlider';
import { MatchDetailModal } from './components/MatchDetailModal';
import { BottomNav } from './components/BottomNav';
import { FavoritesView } from './components/FavoritesView';
import { ClubsView } from './components/ClubsView';
import { ClasificacionView } from './components/ClasificacionView';
import { CamposView } from './components/CamposView';
import { CampoScheduleModal } from './components/CampoScheduleModal';
import { SmartTeamSearchModal } from './components/SmartTeamSearchModal';
import {
  fetchActaPartido,
  fetchCalendario,
  fetchCompetitions,
  fetchGameTypes,
  fetchGroups,
  fetchSeasons,
} from './services/api';
import {
  getFavorites,
  isFavorite,
  removeFavorite,
  toggleFavorite,
  moveFavorite,
  setPrimaryFavorite,
} from './services/favorites';
import {
  ActaPartido,
  CalendarioResponse,
  Competition,
  DeduceTeamResult,
  EquipoGrupo,
  FavoriteTeam,
  GameType,
  Group,
  PartidoCalendario,
  Season,
} from './types';
import { WifiOff, RefreshCcw, CalendarDays, Settings, Trophy } from 'lucide-react';

export function App() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Estado para equipos favoritos almacenados en localStorage
  const [favorites, setFavorites] = useState<FavoriteTeam[]>(() => getFavorites());

  // Al iniciar una nueva sesión, si existen favoritos, preseleccionamos el primer equipo por defecto
  const initialFavorite = favorites.length > 0 ? favorites[0] : null;

  const [selectedSeason, setSelectedSeason] = useState<string>(() => initialFavorite?.seasonId || '');
  const [selectedGameType, setSelectedGameType] = useState<string>(() => initialFavorite?.gameTypeId || '');
  const [selectedCompetition, setSelectedCompetition] = useState<string>(() => initialFavorite?.competitionId || '');
  const [selectedGroup, setSelectedGroup] = useState<string>(() => initialFavorite?.groupId || '');
  const [selectedTeam, setSelectedTeam] = useState<string>(() => initialFavorite?.teamId || '');

  const [calendario, setCalendario] = useState<CalendarioResponse | null>(null);

  // Estado para la pestaña activa en la barra de navegación inferior
  const [activeTab, setActiveTab] = useState<string>('partidos');

  // Estado para el modal de detalle del acta del partido
  const [selectedMatchForDetail, setSelectedMatchForDetail] = useState<PartidoCalendario | null>(null);
  const [actaDetail, setActaDetail] = useState<ActaPartido | null>(null);
  const [isLoadingActa, setIsLoadingActa] = useState(false);
  const [actaError, setActaError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingCalendario, setIsLoadingCalendario] = useState(false);
  const [isOfflineWarning, setIsOfflineWarning] = useState(false);
  const [isSmartSearchOpen, setIsSmartSearchOpen] = useState(false);

  // Estado para el modal contextual de agenda de una instalación deportiva
  const [selectedCampoForModal, setSelectedCampoForModal] = useState<{
    codigoCampo?: string | null;
    nombreCampoFallback?: string | null;
    selectedDateFilter?: string | null;
  } | null>(null);

  // Manejador para aplicar equipo deducido automáticamente
  const handleSelectDeduceTeam = (deduced: DeduceTeamResult) => {
    if (deduced.codigo_temporada) setSelectedSeason(deduced.codigo_temporada);
    if (deduced.codigo_tipo_juego) setSelectedGameType(deduced.codigo_tipo_juego);
    if (deduced.codigo_competicion) setSelectedCompetition(deduced.codigo_competicion);
    if (deduced.codigo_grupo) setSelectedGroup(deduced.codigo_grupo);
    setSelectedTeam(deduced.codigo_equipo);
    setActiveTab('partidos');
  };

  // Carga inicial de temporadas y modalidades
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [seasonsData, gameTypesData] = await Promise.all([
        fetchSeasons(),
        fetchGameTypes(),
      ]);

      setSeasons(seasonsData);
      setGameTypes(gameTypesData);

      const defaultSeason = seasonsData.length > 0 ? seasonsData[0].cod_temporada : '22';
      const defaultGameType = gameTypesData.length > 0 ? gameTypesData[0].codigo_tipo_juego : '1';

      setSelectedSeason((prev) => prev || defaultSeason);
      setSelectedGameType((prev) => prev || defaultGameType);

      setIsOfflineWarning(false);
    } catch {
      setIsOfflineWarning(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Carga reactiva de competiciones
  useEffect(() => {
    if (!selectedSeason || !selectedGameType) return;

    let isSubscribed = true;
    const loadCompetitions = async () => {
      setIsLoadingCompetitions(true);

      try {
        const comps = await fetchCompetitions(selectedSeason, selectedGameType);
        if (isSubscribed) {
          setCompetitions(comps);
          setSelectedCompetition((prev) => {
            if (prev && comps.some((c) => c.codigo === prev)) return prev;
            return comps.length > 0 ? comps[0].codigo : '';
          });
        }
      } catch (error) {
        console.error('Error al cargar competiciones:', error);
      } finally {
        if (isSubscribed) {
          setIsLoadingCompetitions(false);
        }
      }
    };

    loadCompetitions();

    return () => {
      isSubscribed = false;
    };
  }, [selectedSeason, selectedGameType]);

  // Carga reactiva de grupos
  useEffect(() => {
    if (!selectedCompetition) {
      setGroups([]);
      setSelectedGroup('');
      return;
    }

    let isSubscribed = true;
    const loadGroups = async () => {
      setIsLoadingGroups(true);

      try {
        const grps = await fetchGroups(selectedCompetition);
        if (isSubscribed) {
          setGroups(grps);
          setSelectedGroup((prev) => {
            if (prev && grps.some((g) => g.codigo === prev)) return prev;
            return grps.length > 0 ? grps[0].codigo : '';
          });
        }
      } catch (error) {
        console.error('Error al cargar grupos:', error);
      } finally {
        if (isSubscribed) {
          setIsLoadingGroups(false);
        }
      }
    };

    loadGroups();

    return () => {
      isSubscribed = false;
    };
  }, [selectedCompetition]);

  // Carga reactiva del calendario de jornadas una vez seleccionado el grupo
  useEffect(() => {
    if (!selectedSeason || !selectedGameType || !selectedCompetition || !selectedGroup) {
      setCalendario(null);
      return;
    }

    let isSubscribed = true;
    const loadCalendarData = async () => {
      setIsLoadingCalendario(true);
      try {
        const calData = await fetchCalendario(
          selectedSeason,
          selectedGameType,
          selectedCompetition,
          selectedGroup
        );
        if (isSubscribed) {
          setCalendario(calData);
        }
      } catch (error) {
        console.error('Error al cargar calendario de jornadas:', error);
      } finally {
        if (isSubscribed) {
          setIsLoadingCalendario(false);
        }
      }
    };

    loadCalendarData();

    return () => {
      isSubscribed = false;
    };
  }, [selectedSeason, selectedGameType, selectedCompetition, selectedGroup]);

  // Extracción deduplicada de equipos participantes del grupo a partir de las jornadas
  const teams: EquipoGrupo[] = useMemo(() => {
    if (!calendario || !calendario.rounds) return [];
    const teamMap = new Map<string, EquipoGrupo>();

    calendario.rounds.forEach((round) => {
      round.partidos.forEach((p) => {
        if (p.codigo_equipo_local && !teamMap.has(p.codigo_equipo_local)) {
          teamMap.set(p.codigo_equipo_local, {
            codigo: p.codigo_equipo_local,
            nombre: p.equipo_local,
            escudo: p.escudo_equipo_local,
          });
        }
        if (p.codigo_equipo_visitante && !teamMap.has(p.codigo_equipo_visitante)) {
          teamMap.set(p.codigo_equipo_visitante, {
            codigo: p.codigo_equipo_visitante,
            nombre: p.equipo_visitante,
            escudo: p.escudo_equipo_visitante,
          });
        }
      });
    });

    return Array.from(teamMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [calendario]);

  // Manejadores de cambios manuales en selectores para limpiar niveles inferiores
  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeason(seasonId);
    setSelectedCompetition('');
    setSelectedGroup('');
    setSelectedTeam('');
  };

  const handleGameTypeChange = (gameTypeId: string) => {
    setSelectedGameType(gameTypeId);
    setSelectedCompetition('');
    setSelectedGroup('');
    setSelectedTeam('');
  };

  const handleCompetitionChange = (competitionId: string) => {
    setSelectedCompetition(competitionId);
    setSelectedGroup('');
    setSelectedTeam('');
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedTeam('');
  };

  // Comprobar si el equipo actualmente seleccionado está en favoritos
  const isCurrentFavorite = useMemo(() => {
    if (!selectedTeam || !selectedCompetition || !selectedGroup) return false;
    return isFavorite(favorites, selectedTeam, selectedCompetition, selectedGroup);
  }, [favorites, selectedTeam, selectedCompetition, selectedGroup]);

  // Alternar favorito para el equipo actualmente seleccionado
  const handleToggleFavorite = () => {
    if (!selectedTeam || !selectedCompetition || !selectedGroup) return;

    const teamObj = teams.find((t) => t.codigo === selectedTeam);
    const compObj = competitions.find((c) => c.codigo === selectedCompetition);
    const grpObj = groups.find((g) => g.codigo === selectedGroup);
    const seasonObj = seasons.find((s) => s.cod_temporada === selectedSeason);
    const gameTypeObj = gameTypes.find((gt) => gt.codigo_tipo_juego === selectedGameType);

    const teamName = teamObj?.nombre || 'Equipo';
    const teamShield = teamObj?.escudo || null;

    const favoriteItem: FavoriteTeam = {
      teamId: selectedTeam,
      teamName,
      teamShield,
      seasonId: selectedSeason,
      seasonName: seasonObj ? seasonObj.nombre : selectedSeason,
      gameTypeId: selectedGameType,
      gameTypeName: gameTypeObj ? gameTypeObj.nombre : selectedGameType,
      competitionId: selectedCompetition,
      competitionName: compObj ? compObj.nombre : 'Competición',
      groupId: selectedGroup,
      groupName: grpObj ? grpObj.nombre : 'Grupo',
      savedAt: Date.now(),
    };

    const { favorites: updatedFavorites } = toggleFavorite(favoriteItem);
    setFavorites(updatedFavorites);
  };

  // Eliminar favorito desde la vista de favoritos
  const handleRemoveFavorite = (teamId: string, competitionId: string, groupId: string) => {
    const updated = removeFavorite(teamId, competitionId, groupId);
    setFavorites(updated);
  };

  const handleMoveFavorite = (fromIndex: number, toIndex: number) => {
    const updated = moveFavorite(fromIndex, toIndex);
    setFavorites(updated);
  };

  const handleSetPrimaryFavorite = (teamId: string, competitionId: string, groupId: string) => {
    const updated = setPrimaryFavorite(teamId, competitionId, groupId);
    setFavorites(updated);
  };

  // Seleccionar favorito para cargar directamente toda su información
  const handleSelectFavorite = (fav: FavoriteTeam) => {
    setSelectedSeason(fav.seasonId);
    setSelectedGameType(fav.gameTypeId);
    setSelectedCompetition(fav.competitionId);
    setSelectedGroup(fav.groupId);
    setSelectedTeam(fav.teamId);
    setActiveTab('partidos');
  };

  // Manejador para abrir el detalle y consultar el acta oficial
  const handleSelectMatch = async (partido: PartidoCalendario) => {
    setSelectedMatchForDetail(partido);
    setIsLoadingActa(true);
    setActaError(null);
    setActaDetail(null);

    try {
      // El codacta es único global en toda la federación; no enviamos parámetros de competición
      // ajenos que podrían invalidar la consulta si el partido pertenece a otra categoría.
      const actaData = await fetchActaPartido(partido.codacta);
      setActaDetail(actaData);
    } catch (err: any) {
      console.error('Error al recuperar acta del partido:', err);
      setActaError(
        err.message || 'El acta arbitral aún no ha sido publicada o validada en la RFFM.'
      );
    } finally {
      setIsLoadingActa(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
      {/* Contenedor central con formato móvil responsive */}
      <div className="w-full max-w-md min-h-screen flex flex-col relative pb-24">
        
        {/* Cabecera Fija */}
        <Header onRefresh={loadInitialData} isLoading={isLoading} />

        {/* Contenido principal con safe area */}
        <main className="pt-24 px-4 flex-1 space-y-5">
          
          {/* Banner de aviso offline / fallback */}
          {isOfflineWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2 text-xs text-amber-300">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>Conectando con la API local... usando datos en caché de contingencia.</span>
            </div>
          )}

          {activeTab === 'partidos' && (
            <>
              {/* Sección 1: Los 5 Selectores encadenados (incluyendo Equipo opcional con Favorito) */}
              <CompetitionSelector
                seasons={seasons}
                gameTypes={gameTypes}
                competitions={competitions}
                groups={groups}
                teams={teams}
                selectedSeason={selectedSeason}
                selectedGameType={selectedGameType}
                selectedCompetition={selectedCompetition}
                selectedGroup={selectedGroup}
                selectedTeam={selectedTeam}
                onSeasonChange={handleSeasonChange}
                onGameTypeChange={handleGameTypeChange}
                onCompetitionChange={handleCompetitionChange}
                onGroupChange={handleGroupChange}
                onTeamChange={setSelectedTeam}
                isLoading={isLoading}
                isLoadingCompetitions={isLoadingCompetitions}
                isLoadingGroups={isLoadingGroups}
                isCurrentFavorite={isCurrentFavorite}
                onToggleFavorite={handleToggleFavorite}
                onOpenSmartSearch={() => setIsSmartSearchOpen(true)}
                onViewClasificacion={() => setActiveTab('clasificacion')}
              />

              {/* Sección 2: Calendario (Horizontal por Jornadas o Vertical por Equipo) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-red-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {selectedTeam ? 'Partidos del Equipo' : 'Calendario Oficial'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedGroup && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('clasificacion')}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-sm"
                        title="Ver clasificación oficial de este grupo"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Clasificación</span>
                      </button>
                    )}
                    {calendario && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                        {selectedTeam ? 'Vista Continua' : `${calendario.total_jornadas} Jornadas`}
                      </span>
                    )}
                  </div>
                </div>

                <CalendarSlider
                  calendario={calendario}
                  isLoading={isLoadingCalendario}
                  selectedTeam={selectedTeam}
                  onClearTeam={() => setSelectedTeam('')}
                  onSelectMatch={handleSelectMatch}
                  onSelectCampo={(codigoCampo, nombreCampo, fecha) =>
                    setSelectedCampoForModal({
                      codigoCampo,
                      nombreCampoFallback: nombreCampo,
                      selectedDateFilter: fecha,
                    })
                  }
                />
              </div>

              {/* Botón de recarga manual de API */}
              <button
                onClick={loadInitialData}
                disabled={isLoading || isLoadingCalendario}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-850 active:scale-98 border border-slate-800 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${isLoading || isLoadingCalendario ? 'animate-spin text-red-500' : ''}`} />
                <span>Refrescar Calendario Completo</span>
              </button>
            </>
          )}

          {activeTab === 'sedes' && (
            <CamposView
              onSelectActa={(codacta) => {
                handleSelectMatch({
                  codacta,
                  equipo_local: 'Local',
                  equipo_visitante: 'Visitante',
                } as any);
              }}
            />
          )}

          {activeTab === 'clubes' && (
            <ClubsView />
          )}

          {activeTab === 'favoritos' && (
            <FavoritesView
              favorites={favorites}
              onSelectFavorite={handleSelectFavorite}
              onRemoveFavorite={handleRemoveFavorite}
              onMoveFavorite={handleMoveFavorite}
              onSetPrimaryFavorite={handleSetPrimaryFavorite}
              onGoToMatches={() => setActiveTab('partidos')}
            />
          )}

          {activeTab === 'clasificacion' && (
            <ClasificacionView
              seasons={seasons}
              gameTypes={gameTypes}
              competitions={competitions}
              groups={groups}
              selectedSeason={selectedSeason}
              selectedGameType={selectedGameType}
              selectedCompetition={selectedCompetition}
              selectedGroup={selectedGroup}
              onSeasonChange={handleSeasonChange}
              onGameTypeChange={handleGameTypeChange}
              onCompetitionChange={handleCompetitionChange}
              onGroupChange={handleGroupChange}
              isLoadingCompetitions={isLoadingCompetitions}
              isLoadingGroups={isLoadingGroups}
              favoriteTeamCodes={favorites.map((f) => f.teamId)}
            />
          )}

          {activeTab === 'ajustes' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-xl backdrop-blur-md">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Ajustes de la Aplicación</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Caché local activa: <span className="text-amber-400 font-semibold">{favorites.length}</span> equipos favoritos guardados en este navegador.
              </p>
            </div>
          )}

        </main>

        {/* Modal de Detalle de Partido / Acta */}
        <MatchDetailModal
          isOpen={!!selectedMatchForDetail}
          onClose={() => setSelectedMatchForDetail(null)}
          partido={selectedMatchForDetail}
          acta={actaDetail}
          isLoading={isLoadingActa}
          error={actaError}
        />

        {/* Modal Contextual de Agenda de la Instalación Deportiva (Opción A) */}
        {selectedCampoForModal && (
          <CampoScheduleModal
            codigoCampo={selectedCampoForModal.codigoCampo}
            nombreCampoFallback={selectedCampoForModal.nombreCampoFallback}
            selectedDateFilter={selectedCampoForModal.selectedDateFilter}
            onClose={() => setSelectedCampoForModal(null)}
            onSelectActa={(codacta) => {
              handleSelectMatch({
                codacta,
                equipo_local: 'Local',
                equipo_visitante: 'Visitante',
              } as any);
            }}
          />
        )}

        {/* Modal de Búsqueda Inteligente / Deducción de Equipo */}
        <SmartTeamSearchModal
          isOpen={isSmartSearchOpen}
          onClose={() => setIsSmartSearchOpen(false)}
          onSelectTeam={handleSelectDeduceTeam}
        />

        {/* Barra de Navegación Inferior Fija */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          favoritesCount={favorites.length}
        />
      </div>
    </div>
  );
}

export default App;
