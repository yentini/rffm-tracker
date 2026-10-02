import React, { useEffect, useState } from 'react';
import { Club, ClubsPagination, ClubDetail } from '../types';
import { fetchClubs, fetchClubDetail } from '../services/api';
import { ClubDetailModal } from './ClubDetailModal';
import {
  Shield,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  RefreshCcw,
  Loader2,
} from 'lucide-react';

export const ClubsView: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [pagination, setPagination] = useState<ClubsPagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Estados para búsqueda por servidor
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');

  // Estados para el modal de detalle del club
  const [selectedClubCode, setSelectedClubCode] = useState<string | null>(null);
  const [clubDetail, setClubDetail] = useState<ClubDetail | null>(null);
  const [isClubDetailLoading, setIsClubDetailLoading] = useState<boolean>(false);
  const [clubDetailError, setClubDetailError] = useState<string | null>(null);

  const handleOpenClubDetail = async (codigoClub: string) => {
    setSelectedClubCode(codigoClub);
    setIsClubDetailLoading(true);
    setClubDetailError(null);
    try {
      const detail = await fetchClubDetail(codigoClub);
      setClubDetail(detail);
    } catch (err) {
      console.error('Error al cargar detalle del club:', err);
      setClubDetailError('No se pudo obtener la ficha detallada del club desde la RFFM.');
    } finally {
      setIsClubDetailLoading(false);
    }
  };

  const handleCloseClubDetail = () => {
    setSelectedClubCode(null);
    setClubDetail(null);
    setClubDetailError(null);
  };

  // Efecto principal declarativo: carga datos cuando cambia la página o la búsqueda activa
  useEffect(() => {
    let isCancelled = false;

    const executeFetch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchClubs(currentPage, activeSearch);
        if (!isCancelled) {
          setClubs(response.clubs);
          setPagination(response.pagination);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error al cargar clubes:', err);
          setError('No se pudo cargar el listado de clubes desde la RFFM.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    executeFetch();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, activeSearch, refreshKey]);

  // Manejo de cambio en el input
  const handleSearchInputChange = (val: string) => {
    setSearchInput(val);
    // Si el usuario vacía el texto y había una búsqueda activa, restablecemos el listado
    if (val.trim() === '' && activeSearch !== '') {
      setActiveSearch('');
      setCurrentPage(1);
    }
  };

  // Envío de búsqueda al pulsar lupa o Enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      handleClearSearch();
      return;
    }
    if (trimmed === activeSearch) {
      // Si el término es idéntico, forzamos recarga
      setRefreshKey((prev) => prev + 1);
    } else {
      setActiveSearch(trimmed);
      setCurrentPage(1);
    }
  };

  // Limpiar búsqueda
  const handleClearSearch = () => {
    setSearchInput('');
    if (activeSearch !== '') {
      setActiveSearch('');
      setCurrentPage(1);
    }
  };

  // Cambio de página
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = pagination ? pagination.total_paginas : 1;
  const totalRegistros = pagination ? pagination.total_registros : 0;

  return (
    <div className="space-y-4">
      {/* Cabecera de la sección */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl shadow-black/40 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Shield className="w-5 h-5 fill-blue-500/20 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Clubes Federados</h2>
              <p className="text-xs text-slate-400">Directorio oficial de entidades RFFM</p>
            </div>
          </div>
          {totalRegistros > 0 && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
              {totalRegistros} {totalRegistros === 1 ? 'club' : 'clubes'}
            </span>
          )}
        </div>

        {/* Buscador oficial activado por botón de lupa o tecla Enter */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="Escribe el club (ej. Adarve, Majadahonda, Parla)..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                title="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            title="Buscar en la RFFM"
            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </form>

        {/* Indicador de filtro activo */}
        {activeSearch && (
          <div className="flex items-center justify-between text-[11px] bg-blue-950/30 border border-blue-800/40 px-3 py-1.5 rounded-xl text-blue-300">
            <span className="truncate">
              Búsqueda en RFFM: <strong className="text-white">"{activeSearch}"</strong> ({totalRegistros} encontrados)
            </span>
            <button
              onClick={handleClearSearch}
              className="text-[10px] text-blue-400 hover:text-blue-200 underline ml-2 shrink-0"
            >
              Ver todos los clubes
            </button>
          </div>
        )}

        {/* Barra de control de paginación superior */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage <= 1 || isLoading}
                title="Primera página"
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                title="Página anterior"
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <span>Página</span>
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 rounded-lg">
                {currentPage}
              </span>
              <span>de</span>
              <span className="text-slate-400">{totalPages}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                title="Página siguiente"
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage >= totalPages || isLoading}
                title="Última página"
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Estado de error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-center space-y-2">
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* Lista de clubes o Skeleton de carga */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 animate-pulse"
            >
              <div className="w-12 h-12 bg-slate-800 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-800 rounded-lg w-3/4" />
                <div className="h-3 bg-slate-800/60 rounded-md w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-2">
          <Shield className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">No se encontraron clubes</h3>
          <p className="text-xs text-slate-400">
            {activeSearch
              ? `No existen coincidencias para "${activeSearch}" en la RFFM.`
              : 'No hay datos disponibles en esta página.'}
          </p>
          {activeSearch && (
            <button
              onClick={handleClearSearch}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold mt-2"
            >
              Restablecer búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {clubs.map((club) => (
            <div
              key={club.codigo_club}
              onClick={() => handleOpenClubDetail(club.codigo_club)}
              className="bg-slate-900/80 hover:bg-slate-850/90 border border-slate-800/80 hover:border-blue-500/50 rounded-2xl p-3.5 flex items-center gap-3.5 transition-all shadow-md group cursor-pointer hover:shadow-blue-900/10 active:scale-[0.99]"
              title="Pulsar para ver ficha y equipos del club"
            >
              {/* Escudo del Club */}
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-inner group-hover:border-blue-500/40 transition-colors">
                {club.escudo ? (
                  <img
                    src={club.escudo}
                    alt={club.nombre}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Shield className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* Datos del Club */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                    {club.nombre}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    Cód: {club.codigo_club}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  {club.localidad && (
                    <span className="inline-flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800/80 truncate max-w-[170px]">
                      <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="truncate">{club.localidad}</span>
                    </span>
                  )}
                  {club.total_equipos && (
                    <span className="inline-flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800/80 text-emerald-400 font-semibold">
                      <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{club.total_equipos} eq</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Indicador de acción */}
              <div className="shrink-0 p-1.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-500 group-hover:text-blue-400 group-hover:border-blue-500/40 group-hover:bg-blue-500/10 transition-all">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra de paginación inferior */}
      {pagination && totalPages > 1 && !isLoading && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>

          <span className="text-[11px] font-medium text-slate-400">
            Pág. <span className="text-white font-bold">{currentPage}</span> de {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal con la ficha detallada y listado de equipos federados */}
      <ClubDetailModal
        isOpen={Boolean(selectedClubCode)}
        onClose={handleCloseClubDetail}
        clubDetail={clubDetail}
        isLoading={isClubDetailLoading}
        error={clubDetailError}
        onRetry={selectedClubCode ? () => handleOpenClubDetail(selectedClubCode) : undefined}
      />
    </div>
  );
};
