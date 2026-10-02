import React from 'react';
import { Partido, EstadoPartido } from '../types';
import { Shield, Clock } from 'lucide-react';

interface MatchCardProps {
  partido: Partido;
}

const getEstadoBadge = (estado: EstadoPartido, minuto?: number | null) => {
  switch (estado) {
    case 'EN_JUEGO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          {minuto ? `${minuto}'` : 'EN JUEGO'}
        </span>
      );
    case 'DESCANSO':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
          DESCANSO
        </span>
      );
    case 'FINALIZADO':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
          FINAL
        </span>
      );
    case 'APLAZADO':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400">
          APLAZADO
        </span>
      );
    case 'NO_INICIADO':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
          <Clock className="w-3 h-3 text-slate-400" />
          PRÓXIMO
        </span>
      );
  }
};

export const MatchCard: React.FC<MatchCardProps> = ({ partido }) => {
  const isLive = partido.estado === 'EN_JUEGO' || partido.estado === 'DESCANSO';
  const hasScore = partido.goles_local !== null && partido.goles_local !== undefined;

  return (
    <div className={`p-4 rounded-2xl transition-all duration-200 border ${
      isLive 
        ? 'bg-slate-900/80 border-slate-700/80 shadow-lg shadow-black/40 ring-1 ring-emerald-500/20' 
        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
    }`}>
      {/* Encabezado del partido */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60 text-xs">
        <span className="font-semibold text-slate-400 truncate max-w-[200px]">
          {partido.competicion}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">J{partido.jornada}</span>
          {getEstadoBadge(partido.estado, partido.minuto)}
        </div>
      </div>

      {/* Contenido del enfrentamiento */}
      <div className="grid grid-cols-12 items-center gap-2">
        {/* Equipo Local */}
        <div className="col-span-5 flex flex-col items-center text-center space-y-1.5">
          <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center p-2 text-slate-400 border border-slate-700 shadow-inner">
            {partido.local.escudo_url ? (
              <img
                src={partido.local.escudo_url}
                alt={partido.local.nombre}
                className="w-full h-full object-contain rounded-full"
                loading="lazy"
              />
            ) : (
              <Shield className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <span className="text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">
            {partido.local.nombre}
          </span>
        </div>

        {/* Marcador Central */}
        <div className="col-span-2 flex flex-col items-center justify-center">
          {hasScore ? (
            <div className="flex items-center gap-1.5 text-lg font-black tracking-tight text-white bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className={partido.goles_local! > partido.goles_visitante! ? 'text-red-400' : 'text-slate-200'}>
                {partido.goles_local}
              </span>
              <span className="text-slate-600 font-light">:</span>
              <span className={partido.goles_visitante! > partido.goles_local! ? 'text-red-400' : 'text-slate-200'}>
                {partido.goles_visitante}
              </span>
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded bg-slate-800/80 text-xs font-mono font-medium text-slate-400">
              VS
            </div>
          )}
        </div>

        {/* Equipo Visitante */}
        <div className="col-span-5 flex flex-col items-center text-center space-y-1.5">
          <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center p-2 text-slate-400 border border-slate-700 shadow-inner">
            {partido.visitante.escudo_url ? (
              <img
                src={partido.visitante.escudo_url}
                alt={partido.visitante.nombre}
                className="w-full h-full object-contain rounded-full"
                loading="lazy"
              />
            ) : (
              <Shield className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <span className="text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">
            {partido.visitante.nombre}
          </span>
        </div>
      </div>
    </div>
  );
};
