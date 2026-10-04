import React from 'react';
import { FavoriteTeam } from '../types';
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
} from 'lucide-react';

interface FavoritesViewProps {
  favorites: FavoriteTeam[];
  onSelectFavorite: (favorite: FavoriteTeam) => void;
  onRemoveFavorite: (teamId: string, competitionId: string, groupId: string) => void;
  onMoveFavorite?: (fromIndex: number, toIndex: number) => void;
  onSetPrimaryFavorite?: (teamId: string, competitionId: string, groupId: string) => void;
  onGoToMatches: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onSelectFavorite,
  onRemoveFavorite,
  onMoveFavorite,
  onSetPrimaryFavorite,
  onGoToMatches,
}) => {
  return (
    <div className="space-y-4">
      {/* Cabecera de la sección */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Equipos Favoritos</h2>
              <p className="text-xs text-slate-400">
                El <span className="text-amber-400 font-semibold">1º equipo</span> se carga automáticamente al abrir la aplicación
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
            {favorites.length} {favorites.length === 1 ? 'equipo' : 'equipos'}
          </span>
        </div>

        {/* Contenido condicional: Vacío o Lista */}
        {favorites.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 shadow-inner">
              <Star className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-1.5 max-w-xs mx-auto">
              <h3 className="text-sm font-bold text-slate-200">No tienes favoritos aún</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Selecciona cualquier equipo en el menú de partidos y pulsa la{' '}
                <span className="text-amber-400 font-semibold">estrella ⭐</span> para guardarlo y
                acceder a sus jornadas sin volver a buscar.
              </p>
            </div>
            <button
              onClick={onGoToMatches}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-red-600/20 transition-all active:scale-95"
            >
              <span>Explorar Competiciones</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 mt-2">
            {favorites.map((fav, index) => {
              const key = `${fav.teamId}_${fav.competitionId}_${fav.groupId}`;
              const isPrimary = index === 0;

              return (
                <div
                  key={key}
                  className={`py-3.5 first:pt-2 last:pb-1 group rounded-2xl p-2.5 transition-all ${
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

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {fav.teamName}
                          </h4>

                          {isPrimary ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              Principal (Inicio)
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
                          <span className="inline-flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800 truncate max-w-[200px]">
                            <Award className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate">{fav.competitionName}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800 truncate max-w-[140px]">
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

                    {/* Acciones: Reordenar, Cargar y Eliminar */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {/* Controles de orden arriba / abajo */}
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
    </div>
  );
};
