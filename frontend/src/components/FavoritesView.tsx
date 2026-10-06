import React, { useState } from 'react';
import { FavoriteTeam, FavoriteCampo, PartidoCalendario } from '../types';
import { WeekendAgendaView } from './WeekendAgendaView';
import {
  Star,
  Shield,
  Trash2,
  ArrowRight,
  Award,
  Users2,
  Calendar,
  ChevronUp,
  ChevronDown,
  Sparkles,
  MapPin,
  Building2,
  ChevronRight,
} from 'lucide-react';

interface FavoritesViewProps {
  favorites: FavoriteTeam[];
  favoriteCampos: FavoriteCampo[];
  onSelectFavorite: (favorite: FavoriteTeam) => void;
  onRemoveFavorite: (teamId: string, competitionId: string, groupId: string) => void;
  onMoveFavorite?: (fromIndex: number, toIndex: number) => void;
  onSetPrimaryFavorite?: (teamId: string, competitionId: string, groupId: string) => void;
  onSelectCampo: (campo: FavoriteCampo) => void;
  onRemoveFavoriteCampo: (campoId: string) => void;
  onGoToMatches: () => void;
  onGoToCampos: () => void;
  onSelectMatch?: (partido: PartidoCalendario) => void;
  onSelectCampoModal?: (codigoCampo?: string | null, nombreCampoFallback?: string | null) => void;
}

export const resolveFavoriteCampoClub = (campo: { clubAsociado?: string | null; nombreCampo?: string }): string | null => {
  if (campo.clubAsociado && campo.clubAsociado.trim()) return campo.clubAsociado;
  const nom = (campo.nombreCampo || '').toUpperCase();
  if (nom.includes('GANAPANES') || nom.includes('ADARVE')) return 'A.D. UNION ADARVE';
  if (nom.includes('SAN ROQUE')) return 'C.D. SAN ROQUE E.F.F.';
  if (nom.includes('VALDEBEBAS') || nom.includes('CIUDAD REAL MADRID')) return 'REAL MADRID C.F.';
  if (nom.includes('CERRO DEL ESPINO')) return 'ATLÉTICO DE MADRID';
  if (nom.includes('CANAL DE ISABEL')) return 'C.D. BETIS SAN ISIDRO';
  if (nom.includes('COTORRUELO')) return 'R.F.F.M. (Federativo)';
  if (nom.includes('LA ELIPA')) return 'E.D. MORATALAZ';
  if (nom.includes('VALDELASFUENTES') || nom.includes('ALCOBENDAS')) return 'ALCOBENDAS C.F.';
  return null;
};

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  favoriteCampos,
  onSelectFavorite,
  onRemoveFavorite,
  onMoveFavorite,
  onSetPrimaryFavorite,
  onSelectCampo,
  onRemoveFavoriteCampo,
  onGoToMatches,
  onGoToCampos,
  onSelectMatch,
  onSelectCampoModal,
}) => {
  // Pestaña activa dentro de Favoritos: Agenda de Fin de Semana o Gestión de Equipos y Sedes
  const [activeSubTab, setActiveSubTab] = useState<'agenda' | 'gestion'>('agenda');

  // Inicialmente cerrado para sedes y equipos (acordeón mutuamente excluyente)
  const [openSection, setOpenSection] = useState<'equipos' | 'sedes' | null>(null);

  const toggleSection = (section: 'equipos' | 'sedes') => {
    setOpenSection((curr) => (curr === section ? null : section));
  };

  const isEquiposOpen = openSection === 'equipos';
  const isSedesOpen = openSection === 'sedes';

  return (
    <div className="space-y-4">
      {/* Selector de sub-vista: Agenda vs Gestión */}
      <div className="flex p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl shadow-black/40 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveSubTab('agenda')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'agenda'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Agenda Fin de Semana</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('gestion')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'gestion'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Equipos & Sedes ({favorites.length + favoriteCampos.length})</span>
        </button>
      </div>

      {/* VISTA 1: AGENDA DEL FIN DE SEMANA */}
      {activeSubTab === 'agenda' && (
        <WeekendAgendaView
          favorites={favorites}
          onSelectMatch={onSelectMatch || (() => {})}
          onSelectCampo={onSelectCampoModal}
          onGoToMatches={onGoToMatches}
        />
      )}

      {/* VISTA 2: GESTIÓN DE EQUIPOS Y SEDES (ACORDEONES) */}
      {activeSubTab === 'gestion' && (
        <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. SECCIÓN DESPLEGABLE: EQUIPOS FAVORITOS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl shadow-black/40 backdrop-blur-md overflow-hidden transition-all">
        {/* Cabecera / Botón acordeón */}
        <button
          type="button"
          onClick={() => toggleSection('equipos')}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-850/40 transition-colors focus:outline-none"
          aria-expanded={isEquiposOpen}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
                <span>Equipos Favoritos</span>
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {favorites.length === 0
                  ? 'Sin equipos guardados'
                  : `${favorites.length} ${favorites.length === 1 ? 'equipo guardado' : 'equipos guardados'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {favorites.length}
            </span>
            <div className={`p-1.5 rounded-xl bg-slate-800 text-slate-400 transition-transform duration-200 ${isEquiposOpen ? 'rotate-180 text-white' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Contenido desplegable de Equipos */}
        {isEquiposOpen && (
          <div className="p-5 pt-0 border-t border-slate-800/80 animate-in fade-in duration-200">
            <p className="text-xs text-slate-400 py-3">
              El <span className="text-amber-400 font-semibold">1º equipo</span> se carga automáticamente al abrir la aplicación.
            </p>

            {favorites.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 shadow-inner">
                  <Star className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <h3 className="text-xs font-bold text-slate-200">No tienes equipos favoritos aún</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Busca cualquier equipo o pulsa la{' '}
                    <span className="text-amber-400 font-semibold">estrella ⭐</span> para guardarlo y
                    acceder a sus jornadas sin volver a buscar.
                  </p>
                </div>
                <button
                  onClick={onGoToMatches}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95"
                >
                  <span>Explorar Competiciones</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {favorites.map((fav, index) => {
                  const key = `${fav.teamId}_${fav.competitionId}_${fav.groupId}`;
                  const isPrimary = index === 0;

                  return (
                    <div
                      key={key}
                      className={`py-3 first:pt-2 last:pb-1 group rounded-2xl p-2.5 transition-all ${
                        isPrimary
                          ? 'bg-amber-500/[0.04] border border-amber-500/20 shadow-sm'
                          : 'hover:bg-slate-850/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Información del equipo y escudo */}
                        <div
                          onClick={() => onSelectFavorite(fav)}
                          className="flex items-start gap-3 flex-1 cursor-pointer min-w-0"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-inner group-hover:border-amber-500/40 transition-colors">
                            {fav.teamShield ? (
                              <img
                                src={fav.teamShield}
                                alt={fav.teamName}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <Shield className="w-5 h-5 text-slate-500" />
                            )}
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                                {fav.teamName}
                              </h4>

                              {isPrimary ? (
                                <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                  Principal
                                </span>
                              ) : (
                                onSetPrimaryFavorite && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSetPrimaryFavorite(fav.teamId, fav.competitionId, fav.groupId);
                                    }}
                                    title="Fijar este equipo como el que se carga al abrir la app"
                                    className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-300 bg-slate-950/80 hover:bg-amber-500/10 px-2 py-0.5 rounded-md border border-slate-800 hover:border-amber-500/30 transition-all opacity-80 group-hover:opacity-100"
                                  >
                                    <Star className="w-2.5 h-2.5 text-amber-400" />
                                    <span>Hacer principal</span>
                                  </button>
                                )
                              )}
                            </div>

                            {/* Metadatos: Competición y Grupo */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="inline-flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800 truncate max-w-[190px]">
                                <Award className="w-3 h-3 text-blue-400 shrink-0" />
                                <span className="truncate">{fav.competitionName}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800 truncate max-w-[130px]">
                                <Users2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="truncate">{fav.groupName}</span>
                              </span>
                              {fav.seasonName && (
                                <span className="inline-flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800">
                                  <Calendar className="w-3 h-3 text-red-400 shrink-0" />
                                  <span>{fav.seasonName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          {onMoveFavorite && favorites.length > 1 && (
                            <div className="flex flex-col gap-0.5 mr-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveFavorite(index, index - 1);
                                }}
                                disabled={index === 0}
                                title="Mover arriba"
                                className="p-1 rounded-md bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-slate-800"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveFavorite(index, index + 1);
                                }}
                                disabled={index === favorites.length - 1}
                                title="Mover abajo"
                                className="p-1 rounded-md bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-slate-800"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => onSelectFavorite(fav)}
                            title="Ver partidos de este equipo"
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 transition-all active:scale-95 border border-amber-500/20"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFavorite(fav.teamId, fav.competitionId, fav.groupId);
                            }}
                            title="Eliminar de favoritos"
                            className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. SECCIÓN DESPLEGABLE: SEDES E INSTALACIONES FAVORITAS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl shadow-black/40 backdrop-blur-md overflow-hidden transition-all">
        {/* Cabecera / Botón acordeón */}
        <button
          type="button"
          onClick={() => toggleSection('sedes')}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-850/40 transition-colors focus:outline-none"
          aria-expanded={isSedesOpen}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
                <span>Sedes e Instalaciones Favoritas</span>
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {favoriteCampos.length === 0
                  ? 'Sin sedes guardadas'
                  : `${favoriteCampos.length} ${favoriteCampos.length === 1 ? 'sede guardada' : 'sedes guardadas'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              {favoriteCampos.length}
            </span>
            <div className={`p-1.5 rounded-xl bg-slate-800 text-slate-400 transition-transform duration-200 ${isSedesOpen ? 'rotate-180 text-white' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Contenido desplegable de Sedes */}
        {isSedesOpen && (
          <div className="p-5 pt-0 border-t border-slate-800/80 animate-in fade-in duration-200">
            <p className="text-xs text-slate-400 py-3">
              Accede a la agenda completa de partidos de tus campos e instalaciones habituales.
            </p>

            {favoriteCampos.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 shadow-inner">
                  <Building2 className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <h3 className="text-xs font-bold text-slate-200">No tienes sedes guardadas</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    En la sección de <strong>Sedes</strong> o en los detalles de cualquier partido, pulsa la{' '}
                    <span className="text-emerald-400 font-semibold">estrella ⭐</span> en el campo para guardarlo aquí.
                  </p>
                </div>
                <button
                  onClick={onGoToCampos}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95"
                >
                  <span>Explorar Sedes e Instalaciones</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {favoriteCampos.map((campo) => {
                  const clubAsociado = resolveFavoriteCampoClub(campo);

                  return (
                    <div
                      key={campo.codigoCampo}
                      onClick={() => onSelectCampo(campo)}
                      className="py-3.5 sm:py-4 first:pt-2 last:pb-1 group hover:bg-slate-850/40 rounded-2xl p-2.5 sm:p-3 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 cursor-pointer"
                    >
                      {/* Bloque Principal: Línea 1 y Línea 2 en móvil, Izquierda en PC */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Línea 1: Icono + Nombre + Papelera en móvil */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 shrink-0 group-hover:border-emerald-500/40 transition-colors">
                              <MapPin className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight truncate">
                              {campo.nombreCampo}
                            </h4>
                          </div>

                          {/* En móvil: Papelera a la derecha en la fila superior */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFavoriteCampo(campo.codigoCampo);
                            }}
                            title="Eliminar de sedes favoritas"
                            className="sm:hidden p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95 border border-slate-800/50 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Línea 2: De dónde es sede + Dirección / Localidad */}
                        <div className="pl-0 sm:pl-[44px] min-w-0 space-y-1">
                          {clubAsociado && (
                            <div className="flex items-center gap-1.5 flex-wrap text-xs">
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg shrink-0">
                                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Sede de {clubAsociado}</span>
                              </span>
                            </div>
                          )}

                          {(campo.direccion || campo.localidad) && (
                            <p className="text-xs text-slate-400 truncate">
                              {campo.direccion}
                              {campo.localidad && campo.direccion ? <span> • {campo.localidad}</span> : campo.localidad}
                            </p>
                          )}
                        </div>
                      </div>

                    {/* Línea 3 en móvil / Bloque derecho en PC: Botón Ver Agenda (+ Papelera en PC) */}
                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCampo(campo);
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Ver Agenda</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {/* En Desktop: Papelera a la derecha */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFavoriteCampo(campo.codigoCampo);
                        }}
                        title="Eliminar de sedes favoritas"
                        className="hidden sm:inline-flex p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
};
