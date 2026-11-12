import React, { useState, useRef, useMemo } from 'react';
import { DeduceTeamResult } from '../types';
import { searchTeams } from '../services/api';
import { CATEGORY_CHIPS, matchCategory } from '../utils/teamSearch';
import {
  Search,
  X,
  Loader2,
  Sparkles,
  Shield,
  Users,
  AlertCircle,
  Star,
} from 'lucide-react';

interface QuickTeamSearchProps {
  onSelectTeam: (team: DeduceTeamResult) => void;
  favoriteTeamCodes?: string[];
  onToggleFavorite?: (team: DeduceTeamResult) => void;
  selectedTeamCode?: string;
}

export const QuickTeamSearch: React.FC<QuickTeamSearchProps> = ({
  onSelectTeam,
  favoriteTeamCodes = [],
  onToggleFavorite,
  selectedTeamCode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('Todos');
  const [allResults, setAllResults] = useState<DeduceTeamResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const executeSearch = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : searchTerm).trim();

    if (term.length < 2) {
      setError('Escribe al menos 2 caracteres para buscar.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await searchTeams(term);
      setAllResults(res.teams || []);
      setSelectedCat('Todos');
    } catch (err) {
      console.error('Error al deducir equipo:', err);
      setError('No se pudo completar la búsqueda en la RFFM.');
      setAllResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const displayedResults = useMemo(() => {
    return allResults.filter((team) => matchCategory(team, selectedCat));
  }, [allResults, selectedCat]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORY_CHIPS) {
      counts[cat] = allResults.filter((team) => matchCategory(team, cat)).length;
    }
    return counts;
  }, [allResults]);

  return (
    <div className="space-y-3 pt-2">
      {/* Formulario de búsqueda */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ej: Pozuelo, Adarve, Las Rozas..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setAllResults([]);
                setHasSearched(false);
                setError(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || searchTerm.trim().length < 2}
          className="bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-red-900/30 shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
            </>
          )}
        </button>
      </form>

      {/* Pestañas de categoría (chips) */}
      {hasSearched && allResults.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORY_CHIPS.map((cat) => {
            const active = selectedCat === cat;
            const count = categoryCounts[cat] || 0;
            const hasItems = count > 0;

            return (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all flex items-center gap-1 ${
                  active
                    ? 'bg-red-600 text-white shadow-sm shadow-red-900/40'
                    : hasItems
                    ? 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    : 'bg-slate-950/60 border border-slate-850 text-slate-500 opacity-60'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Lista de resultados con scroll limitado */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 no-scrollbar">
        {isLoading ? (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 text-red-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">
              Buscando clubes y deduciendo competiciones en RFFM...
            </p>
          </div>
        ) : error ? (
          <div className="py-4 text-center space-y-1.5 text-rose-400">
            <AlertCircle className="w-5 h-5 mx-auto" />
            <p className="text-xs">{error}</p>
          </div>
        ) : hasSearched && allResults.length === 0 ? (
          <div className="py-6 text-center space-y-1.5">
            <Users className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">
              No se encontraron equipos para "{searchTerm}"
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Prueba a escribir solo el nombre del club (ej: "Adarve", "Pozuelo", "Moratalaz").
            </p>
          </div>
        ) : hasSearched && displayedResults.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <Users className="w-5 h-5 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              No hay equipos en la categoría "{selectedCat}". Hay {allResults.length} en otras categorías.
            </p>
            <button
              type="button"
              onClick={() => setSelectedCat('Todos')}
              className="text-xs text-red-400 hover:text-red-300 font-semibold underline"
            >
              Ver todos ({allResults.length})
            </button>
          </div>
        ) : !hasSearched ? (
          <div className="py-4 text-center space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800/60 p-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Deducción Automática de Equipo</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              Escribe el nombre de tu club para encontrar automáticamente la liga, grupo y calendario oficial.
            </p>
            <div className="pt-1 flex flex-wrap gap-1.5 justify-center max-w-sm mx-auto">
              {['Pozuelo', 'Adarve', 'Las Rozas', 'Moratalaz'].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setSearchTerm(sug);
                    executeSearch(sug);
                  }}
                  className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>⚡</span> {sug}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedResults.map((t) => {
              const isFav = favoriteTeamCodes.includes(t.codigo_equipo);
              const isSelected = selectedTeamCode === t.codigo_equipo;

              return (
                <div
                  key={`${t.codigo_club}-${t.codigo_equipo}`}
                  onClick={() => onSelectTeam(t)}
                  className={`bg-slate-950/70 hover:bg-slate-850 active:scale-[0.99] border rounded-2xl p-2.5 cursor-pointer transition-all flex items-center justify-between gap-2.5 group shadow-sm ${
                    isSelected
                      ? 'border-red-500/80 bg-red-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {t.escudo_club ? (
                      <img
                        src={t.escudo_club}
                        alt={t.nombre_club}
                        className="w-7 h-7 object-contain shrink-0 rounded-md bg-slate-900 p-0.5 border border-slate-800"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">
                        {t.nombre_equipo}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {t.nombre_club} • <span className="text-slate-300 font-medium">{t.categoria}</span>
                      </p>
                      {t.nombre_grupo && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-md font-semibold">
                            {t.nombre_grupo}
                          </span>
                          {t.nombre_competicion && (
                            <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-md truncate max-w-[140px]">
                              {t.nombre_competicion}
                            </span>
                          )}
                          <span className="text-[9px] bg-red-600/10 text-red-400 border border-red-500/20 px-1 py-0.2 rounded-md font-mono">
                            {t.codigo_tipo_juego === '2' ? 'F-7' : 'F-11'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(t);
                        }}
                        title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                        className={`p-1.5 rounded-xl border transition-all ${
                          isFav
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-amber-400'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
