import React, { useState, useMemo } from 'react';
import { TeamDetail, PlayerDetail } from '../types';
import { fetchPlayerDetail } from '../services/api';
import { PlayerDetailModal } from './PlayerDetailModal';
import {
  X,
  Shield,
  MapPin,
  Globe,
  Phone,
  Mail,
  User,
  ExternalLink,
  Users,
  Search,
  AlertCircle,
  Loader2,
  Shirt,
  ArrowLeft,
  Briefcase,
  IdCard,
  ChevronRight,
} from 'lucide-react';

interface TeamDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamDetail: TeamDetail | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({
  isOpen,
  onClose,
  teamDetail,
  isLoading,
  error,
  onRetry,
}) => {
  const [activeTab, setActiveTab] = useState<'jugadores' | 'tecnicos' | 'datos'>('jugadores');
  const [playerSearch, setPlayerSearch] = useState<string>('');

  // Estado para la ficha del jugador seleccionado
  const [selectedPlayerCode, setSelectedPlayerCode] = useState<string | null>(null);
  const [playerDetail, setPlayerDetail] = useState<PlayerDetail | null>(null);
  const [isPlayerDetailLoading, setIsPlayerDetailLoading] = useState<boolean>(false);
  const [playerDetailError, setPlayerDetailError] = useState<string | null>(null);

  const handleOpenPlayer = async (codjugador: string) => {
    setSelectedPlayerCode(codjugador);
    setPlayerDetail(null);
    setPlayerDetailError(null);
    setIsPlayerDetailLoading(true);

    try {
      const data = await fetchPlayerDetail(codjugador);
      setPlayerDetail(data);
    } catch (err: any) {
      setPlayerDetailError(err.message || 'Error al obtener la ficha del jugador');
    } finally {
      setIsPlayerDetailLoading(false);
    }
  };

  const handleClosePlayer = () => {
    setSelectedPlayerCode(null);
    setPlayerDetail(null);
    setPlayerDetailError(null);
  };

  // Filtrado de jugadores por nombre
  const filteredJugadores = useMemo(() => {
    if (!teamDetail?.jugadores) return [];
    if (!playerSearch.trim()) return teamDetail.jugadores;
    const q = playerSearch.toLowerCase().trim();
    return teamDetail.jugadores.filter(
      (j) => j.nombre.toLowerCase().includes(q) || j.cod_jugador.includes(q)
    );
  }, [teamDetail?.jugadores, playerSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Equipo */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 relative">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-semibold active:scale-95"
              title="Volver"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 bg-slate-800 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-slate-800 rounded-lg w-2/3" />
                <div className="h-3.5 bg-slate-800/60 rounded-md w-1/3" />
              </div>
            </div>
          ) : teamDetail ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-800/80 rounded-2xl p-2 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-lg shadow-black/50">
                {teamDetail.escudo_club ? (
                  <img
                    src={teamDetail.escudo_club}
                    alt={teamDetail.nombre_club}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Shield className="w-7 h-7 text-slate-500" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                    {teamDetail.nombre_equipo}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 font-bold">
                    Cód: {teamDetail.codigo_equipo}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 text-[11px]">
                    {teamDetail.categoria}
                  </span>
                  {teamDetail.campo && (
                    <span className="inline-flex items-center gap-1 text-slate-300 text-[11px] truncate max-w-[280px]">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{teamDetail.campo}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Navegación por pestañas */}
          {teamDetail && !isLoading && (
            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-800/60">
              <button
                onClick={() => setActiveTab('jugadores')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'jugadores'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Plantilla ({teamDetail.jugadores?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('tecnicos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'tecnicos'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>
                  Cuerpo Técnico ({ (teamDetail.tecnicos?.length || 0) + (teamDetail.delegados?.length || 0) })
                </span>
              </button>

              <button
                onClick={() => setActiveTab('datos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'datos'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>Campo y Datos</span>
              </button>
            </div>
          )}
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs">Cargando plantilla y detalles del equipo...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3 my-4">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-xs text-red-300 font-medium">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Reintentar consulta
                </button>
              )}
            </div>
          ) : teamDetail ? (
            activeTab === 'jugadores' ? (
              <div className="space-y-3">
                {/* Buscador de jugadores */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Buscar jugador por nombre o dorsal federativo..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                  {playerSearch && (
                    <button
                      onClick={() => setPlayerSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {filteredJugadores.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                    <User className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">
                      No se encontraron jugadores en la plantilla con ese criterio.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredJugadores.map((jugador) => (
                      <button
                        key={jugador.cod_jugador}
                        type="button"
                        onClick={() => handleOpenPlayer(jugador.cod_jugador)}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-2.5 hover:border-blue-500/50 hover:bg-slate-900/80 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white tracking-tight truncate group-hover:text-blue-300 transition-colors">
                              {jugador.nombre}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              Ficha: #{jugador.cod_jugador}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0">
                          <span className="text-[10px] font-medium hidden sm:inline">Ver ficha</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'tecnicos' ? (
              <div className="space-y-4">
                {/* Técnicos */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                    <span>Entrenadores y Técnicos</span>
                  </h3>

                  {(!teamDetail.tecnicos || teamDetail.tecnicos.length === 0) ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                      No hay técnicos registrados oficialmente en este momento.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teamDetail.tecnicos.map((tecnico) => (
                        <div
                          key={tecnico.cod_tecnico}
                          className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">
                                {tecnico.nombre}
                              </h4>
                              <span className="text-[10px] text-slate-400 block">
                                Cuerpo Técnico oficial
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            Cód: {tecnico.cod_tecnico}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delegados */}
                {teamDetail.delegados && teamDetail.delegados.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <IdCard className="w-3.5 h-3.5 text-blue-400" />
                      <span>Delegados y Auxiliares</span>
                    </h3>

                    <div className="space-y-2">
                      {teamDetail.delegados.map((delegado, i) => (
                        <div
                          key={i}
                          className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                              <IdCard className="w-4 h-4" />
                            </div>
                            <h4 className="text-xs font-bold text-white truncate">
                              {delegado.nombre}
                            </h4>
                          </div>
                          {delegado.cod_delegado && (
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">
                              Cód: {delegado.cod_delegado}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Pestaña: Campo y Datos */
              <div className="space-y-4 text-xs">
                {/* Campo de juego */}
                {teamDetail.campo && (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>Terreno de Juego Principal</span>
                    </h3>
                    <p className="text-sm font-bold text-white">{teamDetail.campo}</p>
                    {teamDetail.codigo_campo && (
                      <span className="text-[10px] font-mono text-slate-500 block">
                        Código de Campo RFFM: {teamDetail.codigo_campo}
                      </span>
                    )}
                  </div>
                )}

                {/* Contacto institucional */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Contacto y Correspondencia</span>
                  </h3>

                  <div className="space-y-2 text-slate-300">
                    {teamDetail.domicilio && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">Domicilio</span>
                        <span className="text-white">
                          {teamDetail.domicilio}
                          {teamDetail.codigo_postal ? ` (${teamDetail.codigo_postal})` : ''}
                          {teamDetail.localidad ? ` - ${teamDetail.localidad}` : ''}
                        </span>
                      </div>
                    )}

                    {teamDetail.email && (
                      <div className="flex items-center gap-2 pt-1">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                        <a
                          href={`mailto:${teamDetail.email}`}
                          className="text-blue-400 hover:text-blue-300 underline font-medium"
                        >
                          {teamDetail.email}
                        </a>
                      </div>
                    )}

                    {teamDetail.telefonos && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{teamDetail.telefonos}</span>
                      </div>
                    )}

                    {teamDetail.portal_web && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                        <a
                          href={
                            teamDetail.portal_web.startsWith('http')
                              ? teamDetail.portal_web
                              : `https://${teamDetail.portal_web}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>{teamDetail.portal_web}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Equipaciones */}
                {teamDetail.equipaciones && teamDetail.equipaciones.length > 0 && (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Shirt className="w-3.5 h-3.5 text-blue-400" />
                      <span>Equipación Oficial</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {teamDetail.equipaciones.map((eq, i) => (
                        <div
                          key={i}
                          className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5"
                        >
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">
                            Uniforme {i + 1}
                          </span>
                          {eq.camiseta && (
                            <p className="text-[11px] text-white">
                              <strong className="text-slate-400">Camiseta:</strong> {eq.camiseta}
                            </p>
                          )}
                          {eq.pantalon && (
                            <p className="text-[11px] text-white">
                              <strong className="text-slate-400">Pantalón:</strong> {eq.pantalon}
                            </p>
                          )}
                          {eq.medias && (
                            <p className="text-[11px] text-white">
                              <strong className="text-slate-400">Medias:</strong> {eq.medias}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Modal terciario con la ficha del jugador, estadísticas y temporadas */}
      <PlayerDetailModal
        isOpen={Boolean(selectedPlayerCode)}
        onClose={handleClosePlayer}
        playerDetail={playerDetail}
        isLoading={isPlayerDetailLoading}
        error={playerDetailError}
        onRetry={selectedPlayerCode ? () => handleOpenPlayer(selectedPlayerCode) : undefined}
      />
    </div>
  );
};
