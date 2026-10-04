import React, { useState } from 'react';
import { ActaPartido, PartidoCalendario, PlayerDetail } from '../types';
import { fetchPlayerDetail } from '../services/api';
import { PlayerDetailModal } from './PlayerDetailModal';
import {
  X,
  Shield,
  MapPin,
  Calendar,
  Clock,
  User,
  Loader2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  partido: PartidoCalendario | null;
  acta: ActaPartido | null;
  isLoading: boolean;
  error?: string | null;
}

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

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  isOpen,
  onClose,
  partido,
  acta,
  isLoading,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'incidencias' | 'alineaciones' | 'info'>('incidencias');
  const [teamTab, setTeamTab] = useState<'local' | 'visitante'>('local');

  // Estado para la ficha del jugador seleccionado
  const [selectedPlayerCode, setSelectedPlayerCode] = useState<string | null>(null);
  const [playerDetail, setPlayerDetail] = useState<PlayerDetail | null>(null);
  const [isPlayerDetailLoading, setIsPlayerDetailLoading] = useState<boolean>(false);
  const [playerDetailError, setPlayerDetailError] = useState<string | null>(null);

  const handleOpenPlayer = async (codjugador?: string | null) => {
    if (!codjugador) return;
    setSelectedPlayerCode(codjugador);
    setPlayerDetail(null);
    setPlayerDetailError(null);
    setIsPlayerDetailLoading(true);

    try {
      const pData = await fetchPlayerDetail(codjugador);
      setPlayerDetail(pData);
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

  if (!isOpen || !partido) return null;

  const data = acta || ({} as Partial<ActaPartido>);
  const equipoLocal = data.equipo_local || partido.equipo_local;
  const equipoVisitante = data.equipo_visitante || partido.equipo_visitante;
  const escudoLocal = getEscudoUrl(data.escudo_local || partido.escudo_equipo_local);
  const escudoVisitante = getEscudoUrl(data.escudo_visitante || partido.escudo_equipo_visitante);
  const golesLocal = data.goles_local ?? partido.goles_local;
  const golesVisitante = data.goles_visitante ?? partido.goles_visitante;
  const hasScore = golesLocal !== null && golesLocal !== undefined && golesVisitante !== null && golesVisitante !== undefined;

  const golesLocalList = data.goles_equipo_local || [];
  const golesVisitanteList = data.goles_equipo_visitante || [];
  const tarjetasLocalList = data.tarjetas_equipo_local || [];
  const tarjetasVisitanteList = data.tarjetas_equipo_visitante || [];

  const jugadoresLocal = data.jugadores_equipo_local || [];
  const jugadoresVisitante = data.jugadores_equipo_visitante || [];

  const titularesLocal = jugadoresLocal.filter((j) => j.titular === '1');
  const suplentesLocal = jugadoresLocal.filter((j) => j.suplente === '1' || j.titular === '0');

  const titularesVisitante = jugadoresVisitante.filter((j) => j.titular === '1');
  const suplentesVisitante = jugadoresVisitante.filter((j) => j.suplente === '1' || j.titular === '0');

  const arbitros = data.arbitros_partido || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              Acta Oficial RFFM #{partido.codacta}
            </span>
            {data.nombre_competicion && (
              <span className="text-xs text-slate-400 truncate max-w-[200px]">
                {data.nombre_competicion}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Marcador Principal */}
        <div className="p-5 bg-gradient-to-b from-slate-950/90 to-slate-900/60 border-b border-slate-800">
          <div className="grid grid-cols-7 items-center gap-2 text-center">
            {/* Local */}
            <div className="col-span-3 flex flex-col items-center gap-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center p-2 shadow-lg">
                {escudoLocal ? (
                  <img
                    src={escudoLocal}
                    alt={equipoLocal}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Shield className="w-7 h-7 text-slate-500" />
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                {equipoLocal}
              </h3>
            </div>

            {/* Resultado o Estado */}
            <div className="col-span-1 flex flex-col items-center justify-center space-y-1">
              {hasScore ? (
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-white">{golesLocal}</span>
                  <span className="text-slate-600 font-bold">-</span>
                  <span className="text-2xl sm:text-3xl font-black text-white">{golesVisitante}</span>
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-400">VS</div>
              )}

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                data.acta_cerrada === '1' 
                  ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                  : data.partido_en_juego === '1'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
              }`}>
                {data.acta_cerrada === '1' ? 'FINALIZADO' : data.partido_en_juego === '1' ? 'EN JUEGO' : 'PROGRAMADO'}
              </span>
            </div>

            {/* Visitante */}
            <div className="col-span-3 flex flex-col items-center gap-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center p-2 shadow-lg">
                {escudoVisitante ? (
                  <img
                    src={escudoVisitante}
                    alt={equipoVisitante}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Shield className="w-7 h-7 text-slate-500" />
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                {equipoVisitante}
              </h3>
            </div>
          </div>

          {/* Fecha, Hora y Campo */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
            {(data.fecha || partido.fecha) && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {data.fecha || partido.fecha}
              </span>
            )}
            {(data.hora || partido.hora) && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {data.hora || partido.hora}
              </span>
            )}
            {(data.campo || partido.campo) && (
              <span className="flex items-center gap-1 truncate max-w-[280px]" title={data.campo || partido.campo || ''}>
                <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate">{data.campo || partido.campo}</span>
              </span>
            )}
          </div>
        </div>

        {/* Pestañas de navegación interna */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-3">
          <button
            onClick={() => setActiveTab('incidencias')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'incidencias'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Incidencias ({golesLocalList.length + golesVisitanteList.length} goles)
          </button>
          <button
            onClick={() => setActiveTab('alineaciones')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'alineaciones'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Alineaciones
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'info'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Información & Árbitros
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs font-medium">Recuperando acta oficial desde la RFFM...</p>
            </div>
          ) : error ? (
            <div className="py-10 px-4 bg-slate-950/60 border border-slate-800 rounded-3xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Acta no disponible aún</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">{error}</p>
            </div>
          ) : activeTab === 'incidencias' ? (
            <div className="space-y-4">
              {/* GOLES */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>⚽ Goles</span>
                  <span className="text-[10px] text-slate-500">
                    ({golesLocalList.length + golesVisitanteList.length})
                  </span>
                </h4>

                {golesLocalList.length === 0 && golesVisitanteList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No hay goles registrados para este encuentro.</p>
                ) : (
                  <div className="space-y-2">
                    {/* Goles Locales */}
                    {golesLocalList.map((gol, i) => (
                      <div key={`gol-loc-${i}`} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-extrabold text-emerald-400">{gol.minuto}'</span>
                          <span className="text-white font-medium truncate">{gol.nombre_jugador}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          {equipoLocal}
                        </span>
                      </div>
                    ))}

                    {/* Goles Visitantes */}
                    {golesVisitanteList.map((gol, i) => (
                      <div key={`gol-vis-${i}`} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-extrabold text-emerald-400">{gol.minuto}'</span>
                          <span className="text-white font-medium truncate">{gol.nombre_jugador}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          {equipoVisitante}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TARJETAS */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>🟨 Tarjetas & Sanciones</span>
                  <span className="text-[10px] text-slate-500">
                    ({tarjetasLocalList.length + tarjetasVisitanteList.length})
                  </span>
                </h4>

                {tarjetasLocalList.length === 0 && tarjetasVisitanteList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No se registraron amonestaciones en el acta.</p>
                ) : (
                  <div className="space-y-2">
                    {/* Tarjetas Locales */}
                    {tarjetasLocalList.map((tar, i) => {
                      const isRed = tar.codigo_tipo_amonestacion === '200' || tar.segunda_amarilla === '1';
                      return (
                        <div key={`tar-loc-${i}`} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-800">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-3.5 h-4 rounded-sm flex items-center justify-center font-bold text-[9px] ${
                              isRed ? 'bg-red-500 text-white' : 'bg-amber-400 text-black'
                            }`}>
                              {tar.minuto}'
                            </span>
                            <span className="text-white font-medium truncate">{tar.nombre_jugador}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {equipoLocal}
                          </span>
                        </div>
                      );
                    })}

                    {/* Tarjetas Visitantes */}
                    {tarjetasVisitanteList.map((tar, i) => {
                      const isRed = tar.codigo_tipo_amonestacion === '200' || tar.segunda_amarilla === '1';
                      return (
                        <div key={`tar-vis-${i}`} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-800">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-3.5 h-4 rounded-sm flex items-center justify-center font-bold text-[9px] ${
                              isRed ? 'bg-red-500 text-white' : 'bg-amber-400 text-black'
                            }`}>
                              {tar.minuto}'
                            </span>
                            <span className="text-white font-medium truncate">{tar.nombre_jugador}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {equipoVisitante}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'alineaciones' ? (
            <div className="space-y-4">
              {/* Selector de equipo para alineaciones */}
              <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setTeamTab('local')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all truncate px-2 ${
                    teamTab === 'local'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {equipoLocal}
                </button>
                <button
                  onClick={() => setTeamTab('visitante')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all truncate px-2 ${
                    teamTab === 'visitante'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {equipoVisitante}
                </button>
              </div>

              {/* Lista de Jugadores */}
              {(() => {
                const titulares = teamTab === 'local' ? titularesLocal : titularesVisitante;
                const suplentes = teamTab === 'local' ? suplentesLocal : suplentesVisitante;
                const entrenador = teamTab === 'local' ? data.entrenador_local : data.entrenador_visitante;
                const delegado = teamTab === 'local' ? data.delegadolocal : data.delegado_visitante;

                if (titulares.length === 0 && suplentes.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <p className="text-xs">No hay alineaciones publicadas en el acta oficial todavía.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Titulares */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Titulares ({titulares.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {titulares.map((j, i) => (
                          <div
                            key={`tit-${i}`}
                            onClick={() => j.codjugador && handleOpenPlayer(j.codjugador)}
                            className={`flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs transition-all ${
                              j.codjugador
                                ? 'hover:border-blue-500/50 hover:bg-slate-900/80 cursor-pointer group'
                                : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="w-6 h-6 rounded-lg bg-slate-800 text-rose-400 font-extrabold flex items-center justify-center text-[11px] border border-slate-700 group-hover:text-blue-300">
                                {j.dorsal || '-'}
                              </span>
                              <div className="truncate">
                                <p className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{j.nombre_jugador}</p>
                                <p className="text-[10px] text-slate-400 truncate">{j.posicion || 'Jugador'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {j.capitan === '1' && (
                                <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded" title="Capitán">
                                  C
                                </span>
                              )}
                              {j.portero === '1' && (
                                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 rounded" title="Portero">
                                  P
                                </span>
                              )}
                              {j.codjugador && (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suplentes */}
                    {suplentes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Suplentes ({suplentes.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {suplentes.map((j, i) => (
                            <div
                              key={`sup-${i}`}
                              onClick={() => j.codjugador && handleOpenPlayer(j.codjugador)}
                              className={`flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-xs opacity-90 transition-all ${
                                j.codjugador
                                  ? 'hover:border-blue-500/50 hover:bg-slate-900/80 cursor-pointer group hover:opacity-100'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span className="w-6 h-6 rounded-lg bg-slate-800/60 text-slate-300 font-bold flex items-center justify-center text-[11px] border border-slate-700/60 group-hover:text-blue-300">
                                  {j.dorsal || '-'}
                                </span>
                                <div className="truncate">
                                  <p className="font-medium text-slate-200 truncate group-hover:text-blue-300 transition-colors">{j.nombre_jugador}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{j.posicion || 'Suplente'}</p>
                                </div>
                              </div>
                              {j.codjugador && (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cuerpo Técnico */}
                    {(entrenador || delegado) && (
                      <div className="pt-2 border-t border-slate-800 space-y-1 text-xs text-slate-400">
                        {entrenador && (
                          <p><span className="font-semibold text-slate-300">Entrenador:</span> {entrenador}</p>
                        )}
                        {delegado && (
                          <p><span className="font-semibold text-slate-300">Delegado:</span> {delegado}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* INFO & ARBITROS */
            <div className="space-y-4">
              {/* Equipo Arbitral */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-rose-400" />
                  <span>Equipo Arbitral</span>
                </h4>
                {arbitros.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No hay árbitros asignados en el acta.</p>
                ) : (
                  <div className="space-y-2">
                    {arbitros.map((arb, i) => (
                      <div key={`arb-${i}`} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-medium text-white">{arb.nombre_arbitro}</span>
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          {arb.tipo_arbitro || 'Árbitro'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Instalación */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Instalación Deportiva</span>
                </h4>
                <p className="text-white font-medium">{data.campo || partido.campo || 'Por definir'}</p>
                {data.codigo_campo && (
                  <p className="text-[11px] text-slate-500">Cód. Campo: {data.codigo_campo}</p>
                )}
              </div>

              {/* Enlace oficial RFFM */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
                <span>Acta oficial RFFM:</span>
                <a
                  href={`https://www.rffm.es/competiciones/acta-partido/${partido.codacta}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 underline font-medium"
                >
                  <span>Ver en RFFM.es</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            Cerrar Acta
          </button>
        </div>
      </div>

      {/* Modal con la ficha detallada del jugador */}
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
