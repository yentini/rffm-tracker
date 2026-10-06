import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DeduceTeamResult } from '../types';
import { searchTeams } from '../services/api';
import {
  Search,
  X,
  Loader2,
  Sparkles,
  Shield,
  Trophy,
  Users,
  ChevronRight,
  AlertCircle,
  Star,
} from 'lucide-react';

interface SmartTeamSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam: (team: DeduceTeamResult) => void;
  favoriteTeamCodes?: string[];
  onToggleFavorite?: (team: DeduceTeamResult) => void;
}

const CATEGORY_CHIPS = [
  'Todos',
  'Senior',
  'Juvenil',
  'Cadete',
  'Infantil',
  'Alevín',
  'Benjamín',
  'Prebenjamín',
];

const matchCategory = (team: DeduceTeamResult, cat: string): boolean => {
  if (cat === 'Todos') return true;
  const text = `${team.categoria} ${team.nombre_equipo} ${team.nombre_competicion || ''}`.toLowerCase();
  const cLow = cat.toLowerCase();

  if (cLow === 'senior') {
    return (
      text.includes('senior') ||
      text.includes('sénior') ||
      text.includes('aficionado') ||
      text.includes('tercera federacion') ||
      text.includes('tercera division')
    );
  }
  if (cLow === 'juvenil') return text.includes('juvenil');
  if (cLow === 'cadete') return text.includes('cadete');
  if (cLow === 'infantil') return text.includes('infantil');
  if (cLow === 'alevín' || cLow === 'alevin') {
    return text.includes('alevin') || text.includes('alevín') || text.includes('alev-') || text.includes('alev ');
  }
  if (cLow === 'benjamín' || cLow === 'benjamin') {
    return (
      (text.includes('benjamin') || text.includes('benjamín')) &&
      !text.includes('prebenjamin') &&
      !text.includes('prebenjamín')
    );
  }
  if (cLow === 'prebenjamín' || cLow === 'prebenjamin') {
    return text.includes('prebenjamin') || text.includes('prebenjamín');
  }

  return text.includes(cLow);
};

export const SmartTeamSearchModal: React.FC<SmartTeamSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTeam,
  favoriteTeamCodes = [],
  onToggleFavorite,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('Todos');
  const [allResults, setAllResults] = useState<DeduceTeamResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm('');
      setAllResults([]);
      setSelectedCat('Todos');
      setError(null);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Ejecuta la búsqueda inicial trayendo todos los equipos coincidentes
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
      // Búsqueda global (sin filtro de categoría) para filtrar luego en cliente
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

  // Filtrado instantáneo en memoria por categoría seleccionada (sin recálculos de red)
  const displayedResults = useMemo(() => {
    return allResults.filter((team) => matchCategory(team, selectedCat));
  }, [allResults, selectedCat]);

  // Conteo de equipos por cada categoría a partir del resultado global
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORY_CHIPS) {
      counts[cat] = allResults.filter((team) => matchCategory(team, cat)).length;
    }
    return counts;
  }, [allResults]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabecera del modal */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Búsqueda Rápida de Equipo
              </h2>
              <p className="text-[10px] text-slate-400">
                Deduce automáticamente la competición, grupo y modalidad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campo de búsqueda y filtros por pestaña */}
        <div className="p-4 space-y-3 bg-slate-900">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ej: Adarve, Pozuelo, Las Rozas..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all shadow-inner"
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

          {/* Pestañas de categoría (filtran localmente en memoria sin recálculos) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORY_CHIPS.map((cat) => {
              const active = selectedCat === cat;
              const count = categoryCounts[cat] || 0;
              const hasItems = !hasSearched || count > 0;

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
                      : 'bg-slate-950/60 border border-slate-850 text-slate-500'
                  }`}
                >
                  <span>{cat}</span>
                  {hasSearched && count > 0 && (
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
        </div>

        {/* Lista de resultados o estados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 border-t border-slate-800/80 bg-slate-950/40">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-7 h-7 text-red-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">
                Buscando clubes y deduciendo competiciones oficiales en RFFM...
              </p>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-2 text-rose-400">
              <AlertCircle className="w-6 h-6 mx-auto" />
              <p className="text-xs">{error}</p>
            </div>
          ) : hasSearched && allResults.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Users className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">
                No se encontraron equipos para "{searchTerm}"
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Prueba a escribir solo el nombre del club (ej: "Adarve", "Pozuelo", "Moratalaz").
              </p>
            </div>
          ) : hasSearched && displayedResults.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <Users className="w-6 h-6 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-300">
                  No hay equipos en la categoría "{selectedCat}"
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Hay {allResults.length} equipos encontrados en otras categorías.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCat('Todos')}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-xl transition-colors"
              >
                Ver todos los equipos ({allResults.length})
              </button>
            </div>
          ) : !hasSearched ? (
            <div className="py-8 text-center space-y-3">
              <Trophy className="w-8 h-8 text-slate-700 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-300">
                  Encuentra tu equipo en 1 clic
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Introduce el nombre del club (ej: "Adarve", "Pozuelo") y pulsa <strong>Buscar</strong>. Todos los equipos se cargarán y podrás filtrar por categoría al instante.
                </p>
              </div>

              {/* Sugerencias rápidas clicables */}
              <div className="pt-2 flex flex-wrap gap-1.5 justify-center max-w-sm mx-auto">
                {['Adarve', 'Pozuelo', 'Las Rozas', 'Moratalaz'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setSearchTerm(sug);
                      executeSearch(sug);
                    }}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>⚡</span> {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {selectedCat === 'Todos'
                    ? `Todos los equipos (${displayedResults.length})`
                    : `Categoría ${selectedCat} (${displayedResults.length})`}
                </span>
                {selectedCat !== 'Todos' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCat('Todos')}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    Ver todos ({allResults.length})
                  </button>
                )}
              </div>

              {displayedResults.map((t) => (
                <div
                  key={`${t.codigo_club}-${t.codigo_equipo}`}
                  onClick={() => {
                    onSelectTeam(t);
                    onClose();
                  }}
                  className="bg-slate-900 hover:bg-slate-850 active:scale-[0.99] border border-slate-800 hover:border-slate-700 rounded-2xl p-3 cursor-pointer transition-all flex items-center justify-between gap-3 group shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {t.escudo_club ? (
                      <img
                        src={t.escudo_club}
                        alt={t.nombre_club}
                        className="w-8 h-8 object-contain shrink-0 rounded-md bg-slate-950 p-0.5 border border-slate-800"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">
                        {t.nombre_equipo}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {t.nombre_club} • <span className="text-slate-300">{t.categoria}</span>
                      </p>
                      {t.nombre_grupo && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-md font-semibold">
                            {t.nombre_grupo}
                          </span>
                          {t.nombre_competicion && (
                            <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-md truncate max-w-[170px]">
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
                        title={
                          favoriteTeamCodes.includes(t.codigo_equipo)
                            ? 'Quitar de equipos favoritos'
                            : 'Añadir a equipos favoritos'
                        }
                        className={`p-2 rounded-xl transition-all active:scale-90 ${
                          favoriteTeamCodes.includes(t.codigo_equipo)
                            ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                            : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                        }`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            favoriteTeamCodes.includes(t.codigo_equipo) ? 'fill-amber-400' : ''
                          }`}
                        />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
