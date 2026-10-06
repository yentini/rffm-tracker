import React, { useState } from 'react';
import { CampoItem } from '../types';
import { searchCampos } from '../services/api';
import {
  MapPin,
  Search,
  Loader2,
  Calendar,
  AlertCircle,
  Building2,
  Sparkles,
  ChevronRight,
  X,
  Shield,
  Star,
  Navigation,
} from 'lucide-react';
import { CampoScheduleModal } from './CampoScheduleModal';

interface CamposViewProps {
  onSelectActa?: (codacta: string) => void;
  favoriteCampoIds?: string[];
  onToggleFavoriteCampo?: (campo: CampoItem) => void;
}

const POPULAR_SEDES = [
  'Cotorruelo',
  'Unión Adarve',
  'Vereda Ganapanes',
  'Canal de Isabel II',
  'San Roque',
  'La Elipa',
  'Valdebebas',
  'Alcobendas',
];

export const CamposView: React.FC<CamposViewProps> = ({
  onSelectActa,
  favoriteCampoIds = [],
  onToggleFavoriteCampo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [campos, setCampos] = useState<CampoItem[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sede seleccionada para abrir la agenda de partidos
  const [selectedCampo, setSelectedCampo] = useState<CampoItem | null>(null);

  // Ejecutar búsqueda de campos
  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : searchTerm).trim();
    if (!term) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await searchCampos(term, 1);
      setCampos(data.campos || []);
      setTotalRegistros(data.total_registros || 0);
    } catch (err: any) {
      console.error('Error al buscar campos:', err);
      setError('No se pudieron buscar terrenos de juego en la RFFM. Inténtalo de nuevo.');
      setCampos([]);
      setTotalRegistros(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSuggestionClick = (sede: string) => {
    setSearchTerm(sede);
    handleSearch(sede);
  };

  return (
    <div className="space-y-4">
      {/* Cabecera de la sección */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Sedes e Instalaciones</h2>
              <p className="text-xs text-slate-400">Consulta los partidos y horarios por campo de juego</p>
            </div>
          </div>
          {totalRegistros > 0 && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {totalRegistros} {totalRegistros === 1 ? 'sede' : 'sedes'}
            </span>
          )}
        </div>

        {/* Formulario de búsqueda */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Busca por nombre de campo, club, calle o municipio..."
                className="w-full bg-slate-950/80 border border-slate-700/80 text-white text-sm rounded-2xl pl-10 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-slate-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={isLoading || !searchTerm.trim()}
              className="px-5 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-lg shadow-amber-500/10 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Buscar</span>
            </button>
          </div>

          {/* Sugerencias de sedes populares */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Sugerencias:
            </span>
            {POPULAR_SEDES.map((sede) => (
              <button
                key={sede}
                type="button"
                onClick={() => handleSuggestionClick(sede)}
                className="text-[10px] bg-slate-950/70 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/30 px-2.5 py-1 rounded-xl transition-all"
              >
                {sede}
              </button>
            ))}
          </div>
        </div>

        {/* Mensajes de error o carga */}
        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Lista de resultados */}
        {hasSearched && !isLoading && campos.length === 0 && !error && (
          <div className="text-center py-10 px-4 space-y-2">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No se encontraron campos ni clubes</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Prueba con otro término como el nombre del club, campo o municipio.
            </p>
          </div>
        )}

        {campos.length > 0 && (
          <div className="divide-y divide-slate-800/60 mt-4">
            {campos.map((campo) => {
              const isFav = favoriteCampoIds.includes(campo.codigo);

              return (
                <div
                  key={campo.codigo}
                  onClick={() => setSelectedCampo(campo)}
                  className="py-3.5 sm:py-4 first:pt-2 last:pb-1 group hover:bg-slate-850/40 rounded-2xl p-2.5 sm:p-3 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4"
                >
                  {/* Bloque Principal (Línea 1 + Línea 2 en móvil) */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Línea 1 (Móvil): Icono + Nombre del Campo + Estrella de Favorito a la derecha */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 shrink-0 group-hover:border-amber-500/40 transition-colors">
                          <MapPin className="w-4 h-4 text-amber-400" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors leading-tight truncate">
                          {campo.nombre}
                        </h4>
                      </div>

                      {/* En móvil: únicamente la estrella para favoritos en la fila superior */}
                      {onToggleFavoriteCampo && (
                        <div className="sm:hidden shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavoriteCampo(campo);
                            }}
                            title={isFav ? 'Quitar de sedes favoritas' : 'Añadir a sedes favoritas'}
                            className={`p-2 rounded-xl transition-all active:scale-90 ${
                              isFav
                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                                : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800 border border-slate-800/60'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${isFav ? 'fill-emerald-400' : ''}`} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Línea 2: Sede de [Club] + Dirección / Localidad + Superficie / Tipo */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] pl-0 sm:pl-[44px]">
                      {campo.club_asociado && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg shrink-0">
                          <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Sede de {campo.club_asociado}</span>
                        </span>
                      )}

                      {campo.direccion && (
                        <p className="text-[11px] text-slate-400 truncate max-w-full">
                          {campo.direccion}
                          {campo.localidad && <span> • {campo.localidad}</span>}
                        </p>
                      )}

                      {(campo.superficie || campo.tipo_campo) && (
                        <div className="flex items-center gap-1 text-[10px] shrink-0">
                          {campo.superficie && (
                            <span className="bg-slate-950/80 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-800">
                              {campo.superficie}
                            </span>
                          )}
                          {campo.tipo_campo && (
                            <span className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-800/40">
                              {campo.tipo_campo}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Línea 3 (Móvil) / Bloque derecho (Desktop): Botones de Acción */}
                  <div className="flex items-center gap-2 shrink-0 pt-1.5 sm:pt-0 border-t border-slate-800/50 sm:border-0">
                    {/* Botón Ver Partidos */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCampo(campo);
                      }}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 group-hover:bg-amber-500 text-amber-400 group-hover:text-slate-950 border border-amber-500/20 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Ver Partidos</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Botón Cómo llegar (Google Maps) */}
                    {campo.direccion && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${campo.nombre} ${campo.direccion} ${campo.localidad || 'Madrid'}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Abrir ubicación en Google Maps"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all active:scale-95 shrink-0"
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px]">Cómo llegar</span>
                      </a>
                    )}

                    {/* En Desktop: La estrella de favoritos junto al resto de botones */}
                    {onToggleFavoriteCampo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavoriteCampo(campo);
                        }}
                        title={isFav ? 'Quitar de sedes favoritas' : 'Añadir a sedes favoritas'}
                        className={`hidden sm:inline-flex p-2 rounded-xl transition-all active:scale-90 ${
                          isFav
                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                            : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-emerald-400' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Agenda del Campo Seleccionado */}
      {selectedCampo && (
        <CampoScheduleModal
          codigoCampo={selectedCampo.codigo}
          nombreCampoFallback={selectedCampo.nombre}
          onClose={() => setSelectedCampo(null)}
          onSelectActa={onSelectActa}
          isFavorite={favoriteCampoIds.includes(selectedCampo.codigo)}
          onToggleFavorite={() => onToggleFavoriteCampo && onToggleFavoriteCampo(selectedCampo)}
        />
      )}
    </div>
  );
};
