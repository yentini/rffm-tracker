import React, { useState, useEffect } from 'react';
import { PlayerDetail } from '../types';
import { fetchPlayerDetail } from '../services/api';
import {
  X,
  User,
  Shield,
  Clock,
  Calendar,
  Award,
  Trophy,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Activity,
  Layers,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerDetail: PlayerDetail | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  isOpen,
  onClose,
  playerDetail,
  isLoading,
  error,
  onRetry,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'competiciones' | 'temporadas'>('stats');
  const [currentData, setCurrentData] = useState<PlayerDetail | null>(playerDetail);
  const [selectedTemporada, setSelectedTemporada] = useState<string | null>(null);
  const [isSeasonLoading, setIsSeasonLoading] = useState<boolean>(false);
  const [seasonCache, setSeasonCache] = useState<Record<string, PlayerDetail>>({});

  // Sincronizar datos iniciales cuando cambia la prop playerDetail
  useEffect(() => {
    if (playerDetail) {
      setCurrentData(playerDetail);
      const tempId = playerDetail.codigo_temporada || null;
      setSelectedTemporada(tempId);
      if (tempId) {
        setSeasonCache((prev) => ({ ...prev, [tempId]: playerDetail }));
      }
    } else {
      setCurrentData(null);
      setSelectedTemporada(null);
      setSeasonCache({});
    }
  }, [playerDetail]);

  if (!isOpen) return null;

  const data = currentData || playerDetail;

  // Cambiar de temporada consultando el histórico
  const handleSelectTemporada = async (codigoTemporada: string) => {
    if (!data || isSeasonLoading || codigoTemporada === selectedTemporada) return;

    if (seasonCache[codigoTemporada]) {
      setCurrentData(seasonCache[codigoTemporada]);
      setSelectedTemporada(codigoTemporada);
      return;
    }

    setIsSeasonLoading(true);
    try {
      const seasonData = await fetchPlayerDetail(data.codigo_jugador, codigoTemporada);
      setCurrentData(seasonData);
      setSelectedTemporada(codigoTemporada);
      setSeasonCache((prev) => ({ ...prev, [codigoTemporada]: seasonData }));
    } catch (err) {
      console.error('Error al consultar temporada del jugador:', err);
    } finally {
      setIsSeasonLoading(false);
    }
  };

  // Extraer valores clave de estadísticas
  const getStat = (name: string): string | null => {
    if (!data?.partidos) return null;
    const item = data.partidos.find(
      (p) => p.nombre.toLowerCase().trim() === name.toLowerCase().trim()
    );
    return item ? item.valor : null;
  };

  const getCardStat = (name: string): string => {
    if (!data?.tarjetas) return '0';
    const item = data.tarjetas.find(
      (t) => t.nombre.toLowerCase().trim() === name.toLowerCase().trim()
    );
    return item ? item.valor : '0';
  };

  const titular = getStat('titular') || getStat('titulares') || '-';
  const suplente = getStat('suplente') || getStat('suplentes') || '-';
  const convocados = getStat('convocados') || '-';
  const jugados = getStat('jugados') || '-';
  const totalGoles = getStat('total goles') || getStat('goles') || '0';
  const mediaGoles = getStat('media goles por partido') || null;

  const amarillas = getCardStat('amarillas');
  const rojas = getCardStat('rojas');
  const dobleAmarilla = getCardStat('doble amarilla');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera de la Ficha */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 relative">
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
              <div className="w-16 h-16 bg-slate-800 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-slate-800 rounded-lg w-2/3" />
                <div className="h-4 bg-slate-800/60 rounded-md w-1/3" />
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-bold">Error al cargar la ficha del jugador</p>
                <p className="text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          ) : data ? (
            <div className="flex items-start sm:items-center gap-4">
              {/* Foto o Avatar del Jugador */}
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-1 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-lg shadow-black/50 overflow-hidden">
                  {data.foto ? (
                    <img
                      src={data.foto}
                      alt={data.nombre_jugador}
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="w-9 h-9 text-slate-500" />
                  )}
                </div>

                {/* Dorsal Flotante */}
                {data.dorsal_jugador && (
                  <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center border-2 border-slate-900 shadow-md">
                    #{data.dorsal_jugador}
                  </span>
                )}
              </div>

              {/* Información General */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                    {data.nombre_jugador}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 font-bold">
                    ID: #{data.codigo_jugador}
                  </span>
                  {isSeasonLoading && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Cargando temporada...</span>
                    </span>
                  )}
                </div>

                {/* Equipo y Escudo */}
                {data.equipo && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    {data.escudo_equipo && (
                      <img
                        src={data.escudo_equipo}
                        alt="Escudo"
                        className="w-4 h-4 object-contain shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="font-semibold truncate">{data.equipo}</span>
                  </div>
                )}

                {/* Badges de Categoría, Demarcación, Edad y Temporada Activa */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                  {data.nombre_temporada && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40 font-mono text-[10px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-400" />
                      <span>{data.nombre_temporada}</span>
                    </span>
                  )}
                  {data.posicion_jugador && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/25">
                      {data.posicion_jugador}
                    </span>
                  )}
                  {data.categoria_equipo && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold border border-slate-700/60">
                      {data.categoria_equipo}
                    </span>
                  )}
                  {data.edad && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-medium">
                      {data.edad} años
                    </span>
                  )}
                  {data.anio_nacimiento && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400 font-medium">
                      Nac. {data.anio_nacimiento}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Navegación por pestañas */}
          {data && !isLoading && (
            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-800/60">
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'stats'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Estadísticas</span>
              </button>

              <button
                onClick={() => setActiveTab('competiciones')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'competiciones'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Competiciones ({data.competiciones_participa?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('temporadas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'temporadas'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Trayectoria ({data.listado_temporadas?.length || 0})</span>
              </button>
            </div>
          )}
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Cargando ficha oficial del jugador...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-xs text-slate-400">No se pudieron cargar los datos del jugador.</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/40"
                >
                  Reintentar consulta
                </button>
              )}
            </div>
          ) : data ? (
            activeTab === 'stats' ? (
              <div className="space-y-4">
                {/* Métricas destacadas (KPI Cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Minutos */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Minutos Totales</span>
                    </div>
                    <div className="text-lg font-black text-white">
                      {data.minutos_totales_jugados || '0'}
                      <span className="text-[11px] text-slate-400 font-normal ml-1">min</span>
                    </div>
                    {data.media_minutos_totales_jugados && (
                      <span className="text-[10px] text-blue-400 font-medium block">
                        Media: {data.media_minutos_totales_jugados} min/part.
                      </span>
                    )}
                  </div>

                  {/* Goles */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Goles Totales</span>
                    </div>
                    <div className="text-lg font-black text-amber-300">
                      {totalGoles}
                    </div>
                    {mediaGoles && (
                      <span className="text-[10px] text-amber-400/80 font-medium block">
                        Media: {mediaGoles}
                      </span>
                    )}
                  </div>

                  {/* Partidos Jugados */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Partidos Jugados</span>
                    </div>
                    <div className="text-lg font-black text-white">
                      {jugados !== '-' ? jugados : convocados}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium block">
                      Titular: {titular} · Suplente: {suplente}
                    </span>
                  </div>

                  {/* Tarjetas */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                      <Shield className="w-3.5 h-3.5 text-red-400" />
                      <span>Disciplina</span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold text-xs border border-yellow-500/30">
                        <span className="w-2 h-3 bg-yellow-400 rounded-[1px] inline-block shadow-sm" />
                        {amarillas}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold text-xs border border-red-500/30">
                        <span className="w-2 h-3 bg-red-500 rounded-[1px] inline-block shadow-sm" />
                        {rojas}
                      </span>
                    </div>
                    {dobleAmarilla !== '0' && (
                      <span className="text-[10px] text-yellow-400/80 font-medium block">
                        Doble amarilla: {dobleAmarilla}
                      </span>
                    )}
                  </div>
                </div>

                {/* Desglose Detallado de Estadísticas de Partidos */}
                {data.partidos && data.partidos.length > 0 && (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800/80 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-blue-400" />
                      <span>Desglose de Partidos ({data.nombre_temporada || 'Temporada'})</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {data.partidos.map((stat, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-2.5 flex items-center justify-between"
                        >
                          <span className="text-xs text-slate-400 font-medium">{stat.nombre}</span>
                          <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700/60">
                            {stat.valor}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Desglose de Tarjetas y Sanciones */}
                {data.tarjetas && data.tarjetas.length > 0 && (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800/80 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Registro Disciplinario ({data.nombre_temporada || 'Temporada'})</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {data.tarjetas.map((tarj, idx) => {
                        const isRed = tarj.nombre.toLowerCase().includes('roja');
                        return (
                          <div
                            key={idx}
                            className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-2.5 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-3.5 rounded-[1px] inline-block ${
                                  isRed ? 'bg-red-500 shadow-red-500/50' : 'bg-yellow-400 shadow-yellow-500/50'
                                } shadow-sm`}
                              />
                              <span className="text-xs text-slate-300 font-medium">{tarj.nombre}</span>
                            </div>
                            <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700/60">
                              {tarj.valor}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'competiciones' ? (
              <div className="space-y-3">
                {data.competiciones_participa?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                    <Trophy className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">
                      No hay competiciones registradas para la temporada {data.nombre_temporada || ''}.
                    </p>
                  </div>
                ) : (
                  data.competiciones_participa.map((comp, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          {comp.escudo_equipo && (
                            <img
                              src={comp.escudo_equipo}
                              alt="Escudo"
                              className="w-5 h-5 object-contain shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {comp.nombre_competicion}
                          </h4>
                        </div>
                        {comp.nombre_grupo && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                            {comp.nombre_grupo}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                        {comp.nombre_equipo && (
                          <span className="text-slate-300 font-medium">
                            {comp.nombre_equipo}
                          </span>
                        )}
                        {comp.posicion_equipo && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            Posición: {comp.posicion_equipo}º
                          </span>
                        )}
                        {comp.puntos_equipo && (
                          <span className="inline-flex items-center gap-1 text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {comp.puntos_equipo} pts
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Pestaña Historial y Trayectoria de Temporadas */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-200">
                    Pulsa sobre cualquier año o temporada para consultar el club donde jugó, la categoría, sus competiciones y las estadísticas oficiales de ese periodo.
                  </p>
                </div>

                {data.listado_temporadas?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                    <Calendar className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">
                      No hay historial de temporadas registrado en la RFFM.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>Trayectoria Oficial en RFFM</span>
                      </h3>
                      {data.nombre_temporada && (
                        <span className="text-[11px] font-mono text-slate-400">
                          Visualizando: <strong className="text-blue-300">{data.nombre_temporada}</strong>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {data.listado_temporadas.map((temp, idx) => {
                        const isSelected =
                          selectedTemporada === temp.codigo_temporada ||
                          data.codigo_temporada === temp.codigo_temporada;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectTemporada(temp.codigo_temporada)}
                            disabled={isSeasonLoading}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-950/40 ring-1 ring-blue-500/50'
                                : 'bg-slate-900/70 border-slate-800/60 hover:border-slate-600 hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <Calendar
                                  className={`w-4 h-4 ${
                                    isSelected ? 'text-blue-400' : 'text-slate-400'
                                  }`}
                                />
                                <span className="text-xs font-bold text-white">
                                  {temp.nombre_temporada}
                                </span>
                              </div>
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Activa</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 group-hover:text-blue-400">
                                  <span>Consultar</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                              )}
                            </div>

                            {/* Detalle del club / equipo en esa temporada si está seleccionada */}
                            {isSelected && data.equipo && (
                              <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1.5 border-t border-blue-500/20">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {data.escudo_equipo && (
                                    <img
                                      src={data.escudo_equipo}
                                      alt=""
                                      className="w-4 h-4 object-contain shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <span className="truncate font-semibold text-white">
                                    {data.equipo}
                                  </span>
                                </div>
                                {data.categoria_equipo && (
                                  <span className="text-[10px] font-mono text-blue-300/80 bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">
                                    {data.categoria_equipo}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};
