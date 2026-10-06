import React, { useState, useEffect, useMemo } from 'react';
import { GoleadoresResponse } from '../types';
import { fetchGoleadores } from '../services/api';
import {
  Trophy,
  Search,
  X,
  Loader2,
  AlertCircle,
  Shield,
  User,
  Sparkles,
  Flame,
} from 'lucide-react';

interface GoleadoresTableProps {
  competicion: string;
  grupo: string;
  temporada?: string;
  nombreCompeticionFallback?: string;
  nombreGrupoFallback?: string;
  onSelectPlayer?: (codjugador: string) => void;
}

export const GoleadoresTable: React.FC<GoleadoresTableProps> = ({
  competicion,
  grupo,
  temporada,
  nombreGrupoFallback,
  onSelectPlayer,
}) => {
  const [data, setData] = useState<GoleadoresResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (!competicion || !grupo) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await fetchGoleadores(competicion, grupo, temporada);
        if (isSubscribed) {
          setData(resp);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error('Error al cargar goleadores:', err);
          setError('No se pudo cargar la tabla de goleadores desde la RFFM.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [competicion, grupo, temporada]);

  const filteredGoleadores = useMemo(() => {
    if (!data?.goleadores) return [];
    if (!searchTerm.trim()) return data.goleadores;
    const q = searchTerm.toLowerCase().trim();
    return data.goleadores.filter(
      (g) =>
        g.jugador.toLowerCase().includes(q) ||
        g.nombre_equipo.toLowerCase().includes(q)
    );
  }, [data?.goleadores, searchTerm]);

  // Top 3 goleadores para tarjeta de honor
  const topThree = useMemo(() => {
    return (data?.goleadores || []).slice(0, 3);
  }, [data?.goleadores]);

  if (isLoading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xl backdrop-blur-md animate-pulse">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-medium">
          Cargando tabla de goleadores de la RFFM...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/90 border border-rose-500/30 rounded-3xl p-6 text-center space-y-3 shadow-xl">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-xs text-rose-300 font-medium">{error}</p>
      </div>
    );
  }

  if (!data || data.goleadores.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <Trophy className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">Sin goleadores registrados</h4>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Aún no se han computado goles en las actas oficiales para{' '}
          <strong className="text-slate-300">
            {nombreGrupoFallback || data?.grupo || 'este grupo'}
          </strong>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Podio / Top 3 Destacados */}
      {topThree.length > 0 && !searchTerm.trim() && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
          {topThree.map((scorer, index) => {
            const isFirst = index === 0;
            const isSecond = index === 1;

            const borderClass = isFirst
              ? 'border-amber-400/50 bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-900/90 shadow-amber-500/10'
              : isSecond
              ? 'border-slate-400/40 bg-gradient-to-b from-slate-400/10 via-slate-900/90 to-slate-900/90'
              : 'border-amber-700/40 bg-gradient-to-b from-amber-700/10 via-slate-900/90 to-slate-900/90';

            const badgeColor = isFirst
              ? 'bg-amber-400 text-slate-950 shadow-amber-400/30'
              : isSecond
              ? 'bg-slate-300 text-slate-950'
              : 'bg-amber-600 text-white';

            return (
              <div
                key={scorer.codigo_jugador || index}
                onClick={() => onSelectPlayer && scorer.codigo_jugador && onSelectPlayer(scorer.codigo_jugador)}
                className={`relative rounded-2xl p-2.5 sm:p-3 text-center border shadow-lg flex flex-col items-center justify-between transition-all ${borderClass} ${
                  onSelectPlayer && scorer.codigo_jugador ? 'cursor-pointer hover:scale-[1.02]' : ''
                }`}
              >
                {/* Medalla / Posición */}
                <div
                  className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 ${badgeColor}`}
                >
                  {isFirst && <Sparkles className="w-3 h-3 fill-slate-950" />}
                  <span>#{scorer.posicion}</span>
                </div>

                {/* Foto o Escudo */}
                <div className="relative mt-2 mb-1.5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-slate-950 border-2 border-slate-700/80 flex items-center justify-center mx-auto shadow-inner">
                    {scorer.foto ? (
                      <img
                        src={scorer.foto}
                        alt={scorer.jugador}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  {scorer.escudo_equipo && (
                    <img
                      src={scorer.escudo_equipo}
                      alt={scorer.nombre_equipo}
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-900 border border-slate-700 p-0.5 absolute -bottom-1 -right-1 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                {/* Nombre y Equipo */}
                <div className="w-full min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-bold text-white truncate leading-tight">
                    {scorer.jugador}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">
                    {scorer.nombre_equipo}
                  </p>
                </div>

                {/* Goles Destacados */}
                <div className="mt-2 pt-1 border-t border-slate-800/80 w-full flex items-center justify-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                    {scorer.goles}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold">goles</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Buscador de jugadores / equipos */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtrar por jugador o equipo..."
          className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-9 pr-9 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-all"
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tabla completa de goleadores */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Clasificación de Goleadores
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredGoleadores.length} {filteredGoleadores.length === 1 ? 'goleador' : 'goleadores'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center w-10">Pos</th>
                <th className="py-2.5 px-3">Jugador / Equipo</th>
                <th className="py-2.5 px-2 text-center w-12" title="Partidos Jugados">PJ</th>
                <th className="py-2.5 px-2 text-center w-14 text-amber-400" title="Goles Marcados">Goles</th>
                <th className="py-2.5 px-2 text-center w-12 hidden sm:table-cell" title="Goles de Penalti">Pen.</th>
                <th className="py-2.5 px-3 text-center w-14 hidden sm:table-cell" title="Promedio Goles por Partido">G/P</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
              {filteredGoleadores.map((g) => {
                return (
                  <tr
                    key={`${g.codigo_jugador}-${g.posicion}`}
                    onClick={() => onSelectPlayer && g.codigo_jugador && onSelectPlayer(g.codigo_jugador)}
                    className={`hover:bg-slate-850/60 transition-colors ${
                      onSelectPlayer && g.codigo_jugador ? 'cursor-pointer' : ''
                    }`}
                  >
                    {/* Posición */}
                    <td className="py-2.5 px-3 text-center font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${
                          g.posicion === 1
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : g.posicion === 2
                            ? 'bg-slate-300 text-slate-950 shadow-sm'
                            : g.posicion === 3
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400'
                        }`}
                      >
                        {g.posicion}
                      </span>
                    </td>

                    {/* Jugador y Equipo */}
                    <td className="py-2.5 px-3 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Escudo o foto */}
                        <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                          {g.escudo_equipo ? (
                            <img
                              src={g.escudo_equipo}
                              alt={g.nombre_equipo}
                              className="w-5 h-5 object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="font-bold text-white hover:text-amber-300 transition-colors block truncate leading-tight text-xs">
                            {g.jugador}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                            {g.nombre_equipo}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Partidos Jugados */}
                    <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-xs">
                      {g.partidos_jugados}
                    </td>

                    {/* Goles Totales (Destacado) */}
                    <td className="py-2.5 px-2 text-center font-black text-amber-400 font-mono text-sm">
                      {g.goles}
                    </td>

                    {/* Penaltis */}
                    <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-xs hidden sm:table-cell">
                      {g.goles_penalti}
                    </td>

                    {/* Promedio G/P */}
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-xs hidden sm:table-cell">
                      {g.goles_por_partidos.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
