import { useEffect, useState, useMemo, useRef } from 'react';
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
import { GoleadoresModal } from './components/GoleadoresModal';
import { AuthScreen } from './components/AuthScreen';
import {
  clearAuthSession,
  enableGuestMode,
  fetchCloudFavorites,
  getStoredAuthUser,
  isGuestModeActive,
  syncGuestFavoritesToCloud,
} from './services/auth';
import {
  fetchActaPartido,
  fetchCalendario,
  fetchCompetitions,
  fetchGameTypes,
  fetchGroups,
  fetchSeasons,
  fetchTeamDetail,
  fetchPlayerDetail,
} from './services/api';
import {
  getFavorites,
  isFavorite,
  removeFavorite,
  toggleFavorite,
  moveFavorite,
  setPrimaryFavorite,
  getFavoriteCampos,
  removeFavoriteCampo,
  toggleFavoriteCampo,
  setFavoritesCache,
  setFavoriteCamposCache,
  clearLocalFavorites,
} from './services/favorites';
import {
  ActaPartido,
  AuthResponse,
  AuthUser,
  CalendarioResponse,
  Competition,
  DeduceTeamResult,
  EquipoGrupo,
  FavoriteCampo,
  FavoriteTeam,
  GameType,
  Group,
  PartidoCalendario,
  Season,
} from './types';
import { WifiOff, RefreshCcw, CalendarDays, Settings, Trophy, Flame, ArrowLeft } from 'lucide-react';

export function App() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Estado de autenticación (usuario registrado o modo invitado)
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [isGuest, setIsGuest] = useState<boolean>(() => isGuestModeActive());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Estado para equipos favoritos almacenados en localStorage / cuenta
  const [favorites, setFavorites] = useState<FavoriteTeam[]>(() => getFavorites());

  // Estado para sedes/campos favoritos almacenados en localStorage / cuenta
  const [favoriteCampos, setFavoriteCampos] = useState<FavoriteCampo[]>(() => getFavoriteCampos());

  // Por defecto al ir a la pantalla Equipos solo se preseleccionan Temporada actual y Modalidad Fútbol 11; el resto vacío
  const [selectedSeason, setSelectedSeason] = useState<string>('22');
  const [selectedGameType, setSelectedGameType] = useState<string>('1');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  const [calendario, setCalendario] = useState<CalendarioResponse | null>(null);

  // Estado para la pestaña activa en la barra de navegación inferior (por defecto Favoritos al entrar)
  const [activeTab, setActiveTab] = useState<string>('favoritos');
  // Si el usuario entra a ver un equipo pulsando desde Favoritos, ocultamos los filtros de competición
  const [isViewingFromFavorite, setIsViewingFromFavorite] = useState<boolean>(false);
  // Permite alternar entre los partidos del equipo seleccionado y el calendario completo del grupo por jornadas
  const [showGroupCalendar, setShowGroupCalendar] = useState<boolean>(false);
  // Si el usuario entra a la clasificación desde la vista de un equipo, ocultamos los selectores y permitimos volver al equipo
  const [isClasificacionFromTeam, setIsClasificacionFromTeam] = useState<boolean>(false);

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
  const [isGoleadoresModalOpen, setIsGoleadoresModalOpen] = useState(false);

  // Referencia para asegurar que un grupo seleccionado (ej. por deducción o favorito)
  // no se sobrescriba por carreras asíncronas entre loadCompetitions y loadGroups
  const targetGroupRef = useRef<string | null>(null);

  // Estado para el modal contextual de agenda de una instalación deportiva
  const [selectedCampoForModal, setSelectedCampoForModal] = useState<{
    codigoCampo?: string | null;
    nombreCampoFallback?: string | null;
    selectedDateFilter?: string | null;
  } | null>(null);

  // Manejador para aplicar equipo deducido automáticamente
  const handleSelectDeduceTeam = (deduced: DeduceTeamResult) => {
    targetGroupRef.current = deduced.codigo_grupo || null;
    if (deduced.codigo_temporada) setSelectedSeason(deduced.codigo_temporada);
    if (deduced.codigo_tipo_juego) setSelectedGameType(deduced.codigo_tipo_juego);
    if (deduced.codigo_competicion) setSelectedCompetition(deduced.codigo_competicion);
    if (deduced.codigo_grupo) setSelectedGroup(deduced.codigo_grupo);
    setSelectedTeam(deduced.codigo_equipo);
    setShowGroupCalendar(false);
    setIsViewingFromFavorite(false);
    setActiveTab('partidos');

    // Si por alguna razón el grupo vino vacío, resolverlo dinámicamente mediante la ficha del equipo
    if (!deduced.codigo_grupo && deduced.codigo_equipo) {
      fetchTeamDetail(deduced.codigo_equipo)
        .then(async (td) => {
          if (td?.jugadores && td.jugadores.length > 0) {
            try {
              const pd = await fetchPlayerDetail(td.jugadores[0].cod_jugador);
              const comp =
                pd.competiciones_participa.find(
                  (c) => String(c.codequipo) === String(deduced.codigo_equipo)
                ) || pd.competiciones_participa[0];
              if (comp?.codgrupo) {
                targetGroupRef.current = comp.codgrupo;
                setSelectedGroup(comp.codgrupo);
              }
            } catch {
              // Ignorar error si no se pudo resolver
            }
          }
        })
        .catch(() => {});
    }
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
      const futbol11 =
        gameTypesData.find(
          (gt) => gt.codigo_tipo_juego === '1' || gt.nombre.toLowerCase().includes('11')
        )?.codigo_tipo_juego ||
        (gameTypesData.length > 0 ? gameTypesData[0].codigo_tipo_juego : '1');

      setSelectedSeason((prev) => prev || defaultSeason);
      setSelectedGameType((prev) => prev || futbol11);

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

  // Si hay sesión activa al cargar, sincronizar favoritos desde la base de datos
  useEffect(() => {
    if (!authUser) return;
    fetchCloudFavorites()
      .then((cloudFavs) => {
        if (!cloudFavs) return;
        setFavorites(cloudFavs.teams);
        setFavoriteCampos(cloudFavs.campos);
        setFavoritesCache(cloudFavs.teams);
        setFavoriteCamposCache(cloudFavs.campos);
      })
      .catch(() => {});
  }, [authUser]);

  const handleAuthSuccess = async (auth: AuthResponse) => {
    setAuthUser(auth.user);
    setIsGuest(false);
    setIsAuthModalOpen(false);
    setActiveTab('favoritos');
    try {
      const synced = await syncGuestFavoritesToCloud(favorites, favoriteCampos);
      if (synced) {
        setFavorites(synced.teams);
        setFavoriteCampos(synced.campos);
        setFavoritesCache(synced.teams);
        setFavoriteCamposCache(synced.campos);
      }
    } catch {
      // Continuar con estado local si falla red puntualmente
    }
  };

  const handleContinueAsGuest = () => {
    enableGuestMode();
    setIsGuest(true);
    setIsAuthModalOpen(false);
    setActiveTab('favoritos');
  };

  const handleLogout = () => {
    clearAuthSession();
    clearLocalFavorites();
    setAuthUser(null);
    setIsGuest(false);
    setFavorites([]);
    setFavoriteCampos([]);
  };

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
            if (prev) return prev;
            return '';
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
            const target = targetGroupRef.current;
            if (target) {
              targetGroupRef.current = null;
              return target;
            }
            if (prev) return prev;
            return '';
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

  // Total de partidos del equipo actualmente filtrado
  const teamMatchesCount = useMemo(() => {
    if (!selectedTeam || !calendario) return 0;
    let count = 0;
    calendario.rounds.forEach((round) => {
      round.partidos.forEach((p) => {
        if (p.codigo_equipo_local === selectedTeam || p.codigo_equipo_visitante === selectedTeam) {
          count += 1;
        }
      });
    });
    return count;
  }, [calendario, selectedTeam]);

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

  // Restablecer filtros de Equipos por defecto: Temporada actual y Fútbol 11, el resto vacío
  const resetToDefaultEquiposFilters = () => {
    const defaultSeason = seasons.length > 0 ? seasons[0].cod_temporada : '22';
    const futbol11 =
      gameTypes.find(
        (gt) => gt.codigo_tipo_juego === '1' || gt.nombre.toLowerCase().includes('11')
      )?.codigo_tipo_juego || '1';
    targetGroupRef.current = null;
    setSelectedSeason(defaultSeason);
    setSelectedGameType(futbol11);
    setSelectedCompetition('');
    setSelectedGroup('');
    setSelectedTeam('');
    setShowGroupCalendar(false);
    setIsViewingFromFavorite(false);
    setIsClasificacionFromTeam(false);
  };

  // Volver desde la clasificación contextual al equipo sin resetear filtros
  const handleBackToTeamFromClasificacion = () => {
    setIsClasificacionFromTeam(false);
    setActiveTab('partidos');
  };

  // Seleccionar favorito para cargar directamente su calendario sin los filtros de temporada/modalidad
  const handleSelectFavorite = (fav: FavoriteTeam) => {
    targetGroupRef.current = fav.groupId;
    setSelectedSeason(fav.seasonId || '22');
    setSelectedGameType(fav.gameTypeId || '1');
    setSelectedCompetition(fav.competitionId);
    setSelectedGroup(fav.groupId);
    setSelectedTeam(fav.teamId);
    setShowGroupCalendar(false);
    setIsViewingFromFavorite(true);
    setActiveTab('partidos');

    if (!fav.groupId && fav.teamId) {
      fetchTeamDetail(fav.teamId)
        .then(async (td) => {
          if (td?.jugadores && td.jugadores.length > 0) {
            try {
              const pd = await fetchPlayerDetail(td.jugadores[0].cod_jugador);
              const comp =
                pd.competiciones_participa.find(
                  (c) => String(c.codequipo) === String(fav.teamId)
                ) || pd.competiciones_participa[0];
              if (comp?.codgrupo) {
                targetGroupRef.current = comp.codgrupo;
                if (comp.codigo_competicion) setSelectedCompetition(String(comp.codigo_competicion));
                setSelectedGroup(String(comp.codgrupo));
              }
            } catch {
              // Ignorar si no se pudo resolver
            }
          }
        })
        .catch(() => {});
    }
  };

  // Alternar favorito de sede/campo
  const handleToggleFavoriteCampo = (campo: any) => {
    const campoId = campo.codigo || campo.campoId;
    if (!campoId) return;

    const nombre = campo.nombre || campo.nombre_campo || 'Instalación Deportiva';
    const direccion = campo.direccion || null;
    const localidad = campo.localidad || null;
    const superficie = campo.superficie || campo.superficie_juego || null;
    const tipoCampo = campo.tipoCampo || campo.tipo_campo || null;
    const clubAsociado = campo.clubAsociado || campo.club_asociado || null;

    const favCampoItem: FavoriteCampo = {
      codigoCampo: String(campoId),
      nombreCampo: nombre,
      direccion,
      localidad,
      superficie,
      tipoCampo,
      clubAsociado,
      savedAt: Date.now(),
    };

    const { campos: updated } = toggleFavoriteCampo(favCampoItem);
    setFavoriteCampos(updated);
  };

  // Eliminar sede de favoritos
  const handleRemoveFavoriteCampo = (campoId: string) => {
    const updated = removeFavoriteCampo(campoId);
    setFavoriteCampos(updated);
  };

  // Seleccionar sede favorita para abrir su agenda de partidos
  const handleSelectFavoriteCampo = (favCampo: FavoriteCampo) => {
    setSelectedCampoForModal({
      codigoCampo: favCampo.codigoCampo,
      nombreCampoFallback: favCampo.nombreCampo,
    });
  };

  // Alternar favorito de equipo deducido tras búsqueda rápida
  const handleToggleFavoriteFromDeduce = (team: DeduceTeamResult) => {
    const favoriteItem: FavoriteTeam = {
      teamId: team.codigo_equipo,
      teamName: team.nombre_equipo,
      teamShield: team.escudo_club || null,
      seasonId: team.codigo_temporada || selectedSeason || '22',
      seasonName: selectedSeason || '2024/2025',
      gameTypeId: team.codigo_tipo_juego || selectedGameType || '1',
      gameTypeName: team.codigo_tipo_juego === '2' ? 'Fútbol 7' : 'Fútbol 11',
      competitionId: team.codigo_competicion || '',
      competitionName: team.nombre_competicion || 'Competición Oficial',
      groupId: team.codigo_grupo || '',
      groupName: team.nombre_grupo || 'Grupo',
      savedAt: Date.now(),
    };
    const { favorites: updatedFavorites } = toggleFavorite(favoriteItem);
    setFavorites(updatedFavorites);
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
      const rawMsg = err.message || '';
      const isHttpOr502 =
        rawMsg.includes('502') ||
        rawMsg.includes('404') ||
        rawMsg.includes('500') ||
        rawMsg.includes('Error HTTP') ||
        rawMsg.includes('Failed to fetch') ||
        rawMsg.includes('NetworkError');

      setActaError(
        isHttpOr502
          ? 'El acta arbitral aún no ha sido publicada o validada por el estamento arbitral en la RFFM. Estará disponible una vez disputado el encuentro.'
          : rawMsg
      );
    } finally {
      setIsLoadingActa(false);
    }
  };

  if (!authUser && !isGuest) {
    return (
      <AuthScreen
        onSuccess={handleAuthSuccess}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
      {/* Contenedor central con formato móvil responsive y mejor aprovechamiento del ancho */}
      <div className="w-full max-w-xl min-h-screen flex flex-col relative pb-24">
        
        {/* Cabecera Fija */}
        <Header
          onRefresh={loadInitialData}
          isLoading={isLoading}
          user={authUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        {isAuthModalOpen && (
          <AuthScreen
            isModal
            onCloseModal={() => setIsAuthModalOpen(false)}
            onSuccess={handleAuthSuccess}
            onContinueAsGuest={handleContinueAsGuest}
          />
        )}

        {/* Contenido principal con safe area */}
        <main className="pt-20 sm:pt-24 px-2.5 sm:px-4 flex-1 space-y-4 sm:space-y-5">
          
          {/* Banner de aviso offline / fallback */}
          {isOfflineWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2 text-xs text-amber-300">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>Conectando con la API local... usando datos en caché de contingencia.</span>
            </div>
          )}

          {activeTab === 'partidos' && (
            <>
              {/* Si venimos desde Favoritos, ocultamos los selectores de Temporada/Modalidad y mostramos acceso directo */}
              {isViewingFromFavorite ? (
                <div className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-2.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab('favoritos')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-amber-400" />
                    <span>Volver a Favoritos</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetToDefaultEquiposFilters}
                    className="text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    Buscar otro equipo
                  </button>
                </div>
              ) : (
                /* Sección 1: Los 5 Selectores encadenados y Búsqueda Rápida de Equipo */
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
                  onTeamChange={(teamId) => {
                    setShowGroupCalendar(false);
                    setSelectedTeam(teamId);
                  }}
                  isLoading={isLoading}
                  isLoadingCompetitions={isLoadingCompetitions}
                  isLoadingGroups={isLoadingGroups}
                  isCurrentFavorite={isCurrentFavorite}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenSmartSearch={() => setIsSmartSearchOpen(true)}
                />
              )}

              {/* Sección 2: Calendario (solo se muestra cuando ya hay un grupo o equipo seleccionado) */}
              {(selectedGroup || isViewingFromFavorite) && (
                <>
                  <div className="space-y-2.5 sm:space-y-3 pt-1">
                    <div className="flex flex-wrap items-center justify-between px-1 gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <CalendarDays className="w-4 h-4 text-red-500 shrink-0" />
                        <h3
                          onClick={() => showGroupCalendar && setShowGroupCalendar(false)}
                          className={`text-xs font-bold uppercase tracking-wider text-slate-200 truncate ${
                            showGroupCalendar ? 'cursor-pointer hover:text-white' : ''
                          }`}
                          title={showGroupCalendar ? 'Pulsar para volver a los partidos del equipo' : undefined}
                        >
                          {selectedTeam
                            ? (teams.find((t) => t.codigo === selectedTeam)?.nombre ||
                               favorites.find((f) => f.teamId === selectedTeam)?.teamName ||
                               'Partidos del Equipo')
                            : 'Calendario Oficial'}
                        </h3>
                        {calendario && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full shrink-0">
                            {selectedTeam && !showGroupCalendar
                              ? `${teamMatchesCount} Partidos`
                              : `${calendario.total_jornadas} Jornadas`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        {selectedTeam && (
                          <button
                            type="button"
                            onClick={() => setShowGroupCalendar((prev) => !prev)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-sm border ${
                              showGroupCalendar
                                ? 'bg-red-600 text-white border-red-500 shadow-red-950/50'
                                : 'text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border-red-500/30'
                            }`}
                            title={
                              showGroupCalendar
                                ? 'Volver a ver solo los partidos de este equipo'
                                : 'Ver calendario completo del grupo por jornadas'
                            }
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>Calendario</span>
                          </button>
                        )}
                        {selectedGroup && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsClasificacionFromTeam(true);
                              setActiveTab('clasificacion');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-sm"
                            title="Ver clasificación oficial de este grupo"
                          >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Clasificación</span>
                          </button>
                        )}
                        {selectedCompetition && selectedGroup && (
                          <button
                            type="button"
                            onClick={() => setIsGoleadoresModalOpen(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-sm"
                            title="Ver máximos goleadores del grupo"
                          >
                            <Flame className="w-3.5 h-3.5 text-orange-400" />
                            <span>Goleadores</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <CalendarSlider
                      calendario={calendario}
                      isLoading={isLoadingCalendario}
                      selectedTeam={showGroupCalendar ? '' : selectedTeam}
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
              favoriteCampoIds={favoriteCampos.map((c) => c.codigoCampo)}
              onToggleFavoriteCampo={handleToggleFavoriteCampo}
            />
          )}

          {activeTab === 'clubes' && (
            <ClubsView />
          )}

          {activeTab === 'favoritos' && (
            <FavoritesView
              favorites={favorites}
              favoriteCampos={favoriteCampos}
              onSelectFavorite={handleSelectFavorite}
              onRemoveFavorite={handleRemoveFavorite}
              onMoveFavorite={handleMoveFavorite}
              onSetPrimaryFavorite={handleSetPrimaryFavorite}
              onSelectCampo={handleSelectFavoriteCampo}
              onRemoveFavoriteCampo={handleRemoveFavoriteCampo}
              onGoToMatches={() => {
                resetToDefaultEquiposFilters();
                setActiveTab('partidos');
              }}
              onGoToCampos={() => setActiveTab('sedes')}
              onSelectMatch={handleSelectMatch}
              onSelectCampoModal={(codigoCampo, nombreCampoFallback) =>
                setSelectedCampoForModal({
                  codigoCampo,
                  nombreCampoFallback,
                })
              }
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
              isFromTeam={isClasificacionFromTeam && !!selectedTeam}
              teamName={
                teams.find((t) => t.codigo === selectedTeam)?.nombre ||
                favorites.find((f) => f.teamId === selectedTeam)?.teamName ||
                'Equipo'
              }
              onBackToTeam={handleBackToTeamFromClasificacion}
            />
          )}

          {activeTab === 'ajustes' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-xl backdrop-blur-md">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Ajustes de la Aplicación</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Caché local activa: <span className="text-amber-400 font-semibold">{favorites.length}</span> equipos y{' '}
                <span className="text-emerald-400 font-semibold">{favoriteCampos.length}</span> sedes guardadas en este navegador.
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
            isFavorite={
              selectedCampoForModal.codigoCampo
                ? favoriteCampos.some((c) => c.codigoCampo === selectedCampoForModal.codigoCampo)
                : false
            }
            onToggleFavorite={(campoData) => {
              if (selectedCampoForModal.codigoCampo) {
                handleToggleFavoriteCampo({
                  codigo: selectedCampoForModal.codigoCampo,
                  nombre:
                    campoData?.nombre_campo ||
                    selectedCampoForModal.nombreCampoFallback ||
                    'Instalación Deportiva',
                  direccion: campoData?.direccion,
                  localidad: campoData?.localidad,
                  superficie_juego: campoData?.superficie_juego,
                  tipo_campo: campoData?.tipo_campo,
                });
              }
            }}
          />
        )}

        {/* Modal de Búsqueda Inteligente / Deducción de Equipo */}
        <SmartTeamSearchModal
          isOpen={isSmartSearchOpen}
          onClose={() => setIsSmartSearchOpen(false)}
          onSelectTeam={handleSelectDeduceTeam}
          favoriteTeamCodes={favorites.map((f) => f.teamId)}
          onToggleFavorite={handleToggleFavoriteFromDeduce}
        />

        {/* Modal de Máximos Goleadores */}
        {selectedCompetition && selectedGroup && (
          <GoleadoresModal
            isOpen={isGoleadoresModalOpen}
            onClose={() => setIsGoleadoresModalOpen(false)}
            competicion={selectedCompetition}
            grupo={selectedGroup}
            temporada={selectedSeason}
            nombreCompeticion={competitions.find((c) => c.codigo === selectedCompetition)?.nombre}
            nombreGrupo={groups.find((g) => g.codigo === selectedGroup)?.nombre}
          />
        )}

        {/* Barra de Navegación Inferior Fija */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'partidos') {
              resetToDefaultEquiposFilters();
            }
            if (tab === 'clasificacion') {
              setIsClasificacionFromTeam(false);
            }
            setActiveTab(tab);
          }}
          favoritesCount={favorites.length + favoriteCampos.length}
        />
      </div>
    </div>
  );
}

export default App;
