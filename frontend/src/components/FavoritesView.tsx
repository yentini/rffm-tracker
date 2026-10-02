import React from 'react';
import { FavoriteTeam } from '../types';
import { Star, Shield, Trash2, ArrowRight, Award, Users2, Calendar } from 'lucide-react';

interface FavoritesViewProps {
  favorites: FavoriteTeam[];
  onSelectFavorite: (favorite: FavoriteTeam) => void;
  onRemoveFavorite: (teamId: string, competitionId: string, groupId: string) => void;
  onGoToMatches: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onSelectFavorite,
  onRemoveFavorite,
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
              <p className="text-xs text-slate-400">Acceso directo guardado en tu navegador</p>
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
            {favorites.map((fav) => {
              const key = `${fav.teamId}_${fav.competitionId}_${fav.groupId}`;
              return (
                <div
                  key={key}
                  className="py-3.5 first:pt-2 last:pb-1 group hover:bg-slate-850/40 rounded-2xl p-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Información del equipo y escudo */}
                    <div
                      onClick={() => onSelectFavorite(fav)}
                      className="flex items-start gap-3 flex-1 cursor-pointer"
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

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {fav.teamName}
                          </h4>
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

                    {/* Acciones: Cargar y Eliminar */}
                    <div className="flex items-center gap-1 shrink-0 pt-1">
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
