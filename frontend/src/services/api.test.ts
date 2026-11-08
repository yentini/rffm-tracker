import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './api';

describe('resolveApiBaseUrl', () => {
  it('usa VITE_API_URL cuando está definido eliminando la barra final', () => {
    // Arrange
    const envUrl = 'https://rffm-api.onrender.com/';
    const origin = 'https://rffm.cabrerizolab.net';

    // Act
    const result = resolveApiBaseUrl(envUrl, origin, false);

    // Assert
    expect(result).toBe('https://rffm-api.onrender.com');
  });

  it('usa el origen del navegador en producción cuando VITE_API_URL está vacío (proxy Nginx en Dokploy)', () => {
    // Arrange
    const envUrl = '';
    const origin = 'https://rffm.cabrerizolab.net/';

    // Act
    const result = resolveApiBaseUrl(envUrl, origin, false);

    // Assert
    expect(result).toBe('https://rffm.cabrerizolab.net');
  });

  it('usa http://localhost:8000 en modo desarrollo cuando VITE_API_URL está vacío', () => {
    // Arrange
    const envUrl = '';
    const origin = 'http://localhost:3000';

    // Act
    const result = resolveApiBaseUrl(envUrl, origin, true);

    // Assert
    expect(result).toBe('http://localhost:8000');
  });

  it('hace fallback a http://localhost:8000 si no hay envUrl ni origin válido', () => {
    // Arrange & Act
    const result = resolveApiBaseUrl('   ', undefined, false);

    // Assert
    expect(result).toBe('http://localhost:8000');
  });
});

