import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthSession,
  enableGuestMode,
  getStoredAuthToken,
  getStoredAuthUser,
  isGuestModeActive,
  loginUser,
  registerUser,
  saveAuthSession,
  syncGuestFavoritesToCloud,
} from './auth';

describe('Auth & Cloud Favorites Service', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
      }),
    });
    vi.restoreAllMocks();
  });

  it('gestiona correctamente el modo invitado y la sesión autenticada', () => {
    // Arrange & Act
    expect(isGuestModeActive()).toBe(false);
    enableGuestMode();

    // Assert
    expect(isGuestModeActive()).toBe(true);

    // Act: Guardar sesión desactiva modo invitado
    saveAuthSession({
      access_token: 'jwt-123',
      token_type: 'bearer',
      user: { id: 1, email: 'user@rffm.es', name: 'César', auth_provider: 'local' },
    });

    // Assert
    expect(isGuestModeActive()).toBe(false);
    expect(getStoredAuthToken()).toBe('jwt-123');
    expect(getStoredAuthUser()?.email).toBe('user@rffm.es');

    // Act: Limpiar sesión
    clearAuthSession();
    expect(getStoredAuthToken()).toBeNull();
    expect(getStoredAuthUser()).toBeNull();
  });

  it('registra e inicia sesión persistiendo el token recibido', async () => {
    // Arrange
    const mockAuthResponse = {
      access_token: 'token-abc',
      token_type: 'bearer',
      user: { id: 7, email: 'cesar@cabrerizolab.net', name: 'César', auth_provider: 'local' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAuthResponse,
      })
    );

    // Act
    const reg = await registerUser('cesar@cabrerizolab.net', 'pass1234', 'César');

    // Assert
    expect(reg.access_token).toBe('token-abc');
    expect(getStoredAuthToken()).toBe('token-abc');

    // Act: Login
    const login = await loginUser('cesar@cabrerizolab.net', 'pass1234');
    expect(login.user.email).toBe('cesar@cabrerizolab.net');
  });

  it('sincroniza favoritos de invitado al servidor cuando hay token activo', async () => {
    // Arrange
    saveAuthSession({
      access_token: 'jwt-sync',
      token_type: 'bearer',
      user: { id: 2, email: 'sync@rffm.es', name: 'Sync', auth_provider: 'local' },
    });
    const mockSynced = { teams: [], campos: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSynced,
      })
    );

    // Act
    const res = await syncGuestFavoritesToCloud([], []);

    // Assert
    expect(res).toEqual(mockSynced);
  });
});

