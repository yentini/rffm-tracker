import {
  AuthResponse,
  AuthUser,
  FavoriteCampo,
  FavoriteTeam,
  UserFavoritesResponse,
} from '../types';
import { resolveApiBaseUrl } from './api';

const AUTH_TOKEN_KEY = 'rfef_tracker_auth_token';
const AUTH_USER_KEY = 'rfef_tracker_auth_user';
const GUEST_MODE_KEY = 'rfef_tracker_guest_mode';

function getBaseUrl(): string {
  return resolveApiBaseUrl(
    import.meta.env.VITE_API_URL,
    typeof window !== 'undefined' ? window.location.origin : undefined
  );
}

/**
 * Obtiene el token JWT almacenado localmente si existe.
 */
export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Obtiene el usuario autenticado almacenado localmente.
 */
export function getStoredAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Persiste la sesión autenticada en localStorage y desactiva el modo invitado.
 */
export function saveAuthSession(auth: AuthResponse): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, auth.access_token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(auth.user));
    localStorage.removeItem(GUEST_MODE_KEY);
  } catch (err) {
    console.error('Error al guardar sesión de usuario:', err);
  }
}

/**
 * Cierra la sesión actual eliminando el token y los datos de usuario.
 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(GUEST_MODE_KEY);
  } catch (err) {
    console.error('Error al limpiar sesión:', err);
  }
}

/**
 * Comprueba si el usuario eligió entrar en modo invitado.
 */
export function isGuestModeActive(): boolean {
  try {
    return localStorage.getItem(GUEST_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Activa el modo invitado para entrar sin cuenta.
 */
export function enableGuestMode(): void {
  try {
    localStorage.setItem(GUEST_MODE_KEY, 'true');
  } catch (err) {
    console.error('Error al activar modo invitado:', err);
  }
}

async function parseAuthResult(res: Response): Promise<AuthResponse> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Error de autenticación (${res.status})`);
  }
  saveAuthSession(data as AuthResponse);
  return data as AuthResponse;
}

/**
 * Obtiene la configuración pública de autenticación desde el backend (ej. google_client_id).
 */
export async function fetchAuthConfig(): Promise<{ google_client_id: string }> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/auth/config`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { google_client_id: '' };
    return (await res.json()) as { google_client_id: string };
  } catch {
    return { google_client_id: '' };
  }
}

/**
 * Registra una nueva cuenta de usuario con email y contraseña.
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  return parseAuthResult(res);
}

/**
 * Inicia sesión con email y contraseña.
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseAuthResult(res);
}

/**
 * Inicia sesión o registra usuario mediante credencial ID Token de Google.
 */
export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ credential }),
  });
  return parseAuthResult(res);
}

/**
 * Recupera desde la base de datos los equipos y sedes favoritas del usuario autenticado.
 */
export async function fetchCloudFavorites(): Promise<UserFavoritesResponse | null> {
  const token = getStoredAuthToken();
  if (!token) return null;
  const res = await fetch(`${getBaseUrl()}/api/favorites`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as UserFavoritesResponse;
}

/**
 * Sincroniza (fusiona) los favoritos locales del modo invitado con la cuenta en la nube.
 */
export async function syncGuestFavoritesToCloud(
  teams: FavoriteTeam[],
  campos: FavoriteCampo[]
): Promise<UserFavoritesResponse | null> {
  const token = getStoredAuthToken();
  if (!token) return null;
  const res = await fetch(`${getBaseUrl()}/api/favorites/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ teams, campos }),
  });
  if (!res.ok) return null;
  return (await res.json()) as UserFavoritesResponse;
}

/**
 * Guarda la lista ordenada de equipos favoritos en la base de datos del usuario.
 */
export async function saveCloudFavoriteTeams(teams: FavoriteTeam[]): Promise<void> {
  const token = getStoredAuthToken();
  if (!token) return;
  try {
    await fetch(`${getBaseUrl()}/api/favorites/teams`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ teams }),
    });
  } catch (err) {
    console.warn('No se pudieron sincronizar los equipos favoritos con el servidor:', err);
  }
}

/**
 * Guarda la lista ordenada de sedes favoritas en la base de datos del usuario.
 */
export async function saveCloudFavoriteCampos(campos: FavoriteCampo[]): Promise<void> {
  const token = getStoredAuthToken();
  if (!token) return;
  try {
    await fetch(`${getBaseUrl()}/api/favorites/campos`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ campos }),
    });
  } catch (err) {
    console.warn('No se pudieron sincronizar las sedes favoritas con el servidor:', err);
  }
}

