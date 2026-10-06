import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  isFavorite,
  getFavoriteKey,
  moveFavorite,
  setPrimaryFavorite,
  getFavoriteCampos,
  addFavoriteCampo,
  removeFavoriteCampo,
  toggleFavoriteCampo,
  isFavoriteCampo,
} from './favorites';
import { FavoriteTeam } from '../types';

describe('Favorites Service (localStorage cache)', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // Mock completo de localStorage para pruebas herméticas
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      }),
    });
  });

  const sampleTeam1: FavoriteTeam = {
    teamId: '1001',
    teamName: 'Rayo Majadahonda Juvenil A',
    teamShield: 'https://example.com/shield1.png',
    seasonId: '22',
    seasonName: '2024-2025',
    gameTypeId: '1',
    gameTypeName: 'Fútbol Campo',
    competitionId: '2001',
    competitionName: 'División de Honor',
    groupId: '3001',
    groupName: 'Grupo 5',
    savedAt: 1700000000000,
  };

  const sampleTeam2: FavoriteTeam = {
    teamId: '1002',
    teamName: 'Atlético de Madrid Infantil A',
    seasonId: '22',
    seasonName: '2024-2025',
    gameTypeId: '1',
    gameTypeName: 'Fútbol Campo',
    competitionId: '2002',
    competitionName: 'Autonómica Infantil',
    groupId: '3002',
    groupName: 'Grupo 1',
    savedAt: 1700000001000,
  };

  it('debe devolver un array vacío si no hay favoritos en localStorage', () => {
    const favorites = getFavorites();
    expect(favorites).toEqual([]);
  });

  it('debe generar claves unívocas para la tupla equipo-competición-grupo', () => {
    const key = getFavoriteKey('1001', '2001', '3001');
    expect(key).toBe('1001_2001_3001');
  });

  it('debe añadir un equipo a favoritos y persistirlo', () => {
    const result = addFavorite(sampleTeam1);
    expect(result).toHaveLength(1);
    expect(result[0].teamId).toBe('1001');

    const stored = getFavorites();
    expect(stored).toHaveLength(1);
    expect(stored[0].teamName).toBe('Rayo Majadahonda Juvenil A');
  });

  it('debe verificar correctamente si un equipo es favorito o no', () => {
    addFavorite(sampleTeam1);
    const favorites = getFavorites();

    expect(isFavorite(favorites, '1001', '2001', '3001')).toBe(true);
    expect(isFavorite(favorites, '9999', '2001', '3001')).toBe(false);
    expect(isFavorite(favorites, '1001', '9999', '3001')).toBe(false);
  });

  it('debe alternar (toggle) un equipo entre favorito y no favorito', () => {
    // 1. Primera pulsación: Se añade a favoritos
    const toggle1 = toggleFavorite(sampleTeam1);
    expect(toggle1.isFav).toBe(true);
    expect(toggle1.favorites).toHaveLength(1);

    // 2. Segunda pulsación: Se elimina de favoritos
    const toggle2 = toggleFavorite(sampleTeam1);
    expect(toggle2.isFav).toBe(false);
    expect(toggle2.favorites).toHaveLength(0);
  });

  it('debe permitir eliminar un equipo favorito específico', () => {
    addFavorite(sampleTeam1);
    addFavorite(sampleTeam2);

    expect(getFavorites()).toHaveLength(2);

    const remaining = removeFavorite('1001', '2001', '3001');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].teamId).toBe('1002');
  });

  it('debe manejar datos corruptos o no JSON en localStorage sin lanzar excepción', () => {
    mockStorage['rfef_tracker_favorite_teams'] = '{ corrupt json';
    const result = getFavorites();
    expect(result).toEqual([]);
  });

  it('debe permitir mover y reordenar equipos favoritos', () => {
    addFavorite(sampleTeam1);
    addFavorite(sampleTeam2);

    // sampleTeam2 está en 0 y sampleTeam1 en 1
    const beforeMove = getFavorites();
    expect(beforeMove[0].teamId).toBe('1002');
    expect(beforeMove[1].teamId).toBe('1001');

    // Mover posición 1 a posición 0
    const afterMove = moveFavorite(1, 0);
    expect(afterMove[0].teamId).toBe('1001');
    expect(afterMove[1].teamId).toBe('1002');

    // Comprobar persistencia en localStorage
    expect(getFavorites()[0].teamId).toBe('1001');
  });

  it('debe permitir establecer un equipo como principal en la primera posición', () => {
    addFavorite(sampleTeam1);
    addFavorite(sampleTeam2);

    // sampleTeam1 está actualmente en la posición 1
    const updated = setPrimaryFavorite('1001', '2001', '3001');
    expect(updated[0].teamId).toBe('1001');
    expect(updated[1].teamId).toBe('1002');
  });

  describe('Sedes / Campos Favoritos', () => {
    const sampleCampo = {
      codigoCampo: 'campo-101',
      nombreCampo: 'Ernesto Cotorruelo 1',
      localidad: 'Madrid',
      savedAt: Date.now(),
    };

    it('debe guardar, consultar y alternar una sede favorita', () => {
      expect(getFavoriteCampos()).toHaveLength(0);
      expect(isFavoriteCampo([], 'campo-101')).toBe(false);

      const added = addFavoriteCampo(sampleCampo);
      expect(added).toHaveLength(1);
      expect(getFavoriteCampos()).toHaveLength(1);
      expect(isFavoriteCampo(added, 'campo-101')).toBe(true);

      const toggledOff = toggleFavoriteCampo(sampleCampo);
      expect(toggledOff.isFav).toBe(false);
      expect(getFavoriteCampos()).toHaveLength(0);

      const toggledOn = toggleFavoriteCampo(sampleCampo);
      expect(toggledOn.isFav).toBe(true);
      expect(getFavoriteCampos()).toHaveLength(1);

      const removed = removeFavoriteCampo('campo-101');
      expect(removed).toHaveLength(0);
      expect(getFavoriteCampos()).toHaveLength(0);
    });
  });
});
