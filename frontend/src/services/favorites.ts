import { FavoriteTeam } from '../types';

const FAVORITES_STORAGE_KEY = 'rfef_tracker_favorite_teams';

/**
 * Genera una clave única compuesta para identificar a un equipo dentro de una liga y grupo.
 */
export function getFavoriteKey(teamId: string, competitionId: string, groupId: string): string {
  return `${teamId}_${competitionId}_${groupId}`;
}

/**
 * Lee la lista de equipos favoritos almacenados en localStorage.
 * En caso de fallo o parseo corrupto, devuelve un array vacío de manera segura.
 */
export function getFavorites(): FavoriteTeam[] {
  try {
    const data = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error al leer favoritos desde localStorage:', error);
    return [];
  }
}

/**
 * Persiste la lista de favoritos en localStorage de forma segura.
 */
function persistFavorites(favorites: FavoriteTeam[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Error al guardar favoritos en localStorage:', error);
  }
}

/**
 * Comprueba si un equipo ya está guardado en favoritos.
 */
export function isFavorite(
  favorites: FavoriteTeam[],
  teamId: string,
  competitionId: string,
  groupId: string
): boolean {
  if (!teamId || !competitionId || !groupId) return false;
  return favorites.some(
    (f) => f.teamId === teamId && f.competitionId === competitionId && f.groupId === groupId
  );
}

/**
 * Añade o actualiza un equipo a la lista de favoritos.
 */
export function addFavorite(favorite: FavoriteTeam): FavoriteTeam[] {
  const current = getFavorites();
  const filtered = current.filter(
    (f) =>
      !(
        f.teamId === favorite.teamId &&
        f.competitionId === favorite.competitionId &&
        f.groupId === favorite.groupId
      )
  );
  const updated = [favorite, ...filtered];
  persistFavorites(updated);
  return updated;
}

/**
 * Elimina un equipo de la lista de favoritos.
 */
export function removeFavorite(
  teamId: string,
  competitionId: string,
  groupId: string
): FavoriteTeam[] {
  const current = getFavorites();
  const updated = current.filter(
    (f) =>
      !(
        f.teamId === teamId &&
        f.competitionId === competitionId &&
        f.groupId === groupId
      )
  );
  persistFavorites(updated);
  return updated;
}

/**
 * Alterna el estado de favorito de un equipo (lo añade si no existe, lo quita si existe).
 */
export function toggleFavorite(favorite: FavoriteTeam): {
  isFav: boolean;
  favorites: FavoriteTeam[];
} {
  const current = getFavorites();
  const exists = isFavorite(current, favorite.teamId, favorite.competitionId, favorite.groupId);

  if (exists) {
    const updated = removeFavorite(favorite.teamId, favorite.competitionId, favorite.groupId);
    return { isFav: false, favorites: updated };
  } else {
    const updated = addFavorite(favorite);
    return { isFav: true, favorites: updated };
  }
}

/**
 * Reordena un favorito desplazándolo de una posición a otra.
 */
export function moveFavorite(fromIndex: number, toIndex: number): FavoriteTeam[] {
  const current = getFavorites();
  if (
    fromIndex < 0 ||
    fromIndex >= current.length ||
    toIndex < 0 ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return current;
  }

  const updated = [...current];
  const [movedItem] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, movedItem);
  persistFavorites(updated);
  return updated;
}

/**
 * Establece un equipo como el principal (posición 0), haciéndolo el equipo por defecto al iniciar sesión.
 */
export function setPrimaryFavorite(
  teamId: string,
  competitionId: string,
  groupId: string
): FavoriteTeam[] {
  const current = getFavorites();
  const index = current.findIndex(
    (f) => f.teamId === teamId && f.competitionId === competitionId && f.groupId === groupId
  );
  if (index <= 0) return current;
  return moveFavorite(index, 0);
}
