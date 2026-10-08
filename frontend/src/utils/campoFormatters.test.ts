import { describe, it, expect } from 'vitest';
import { formatGrupo, formatTime, formatDateLabel } from './campoFormatters';

describe('campoFormatters', () => {
  describe('formatGrupo', () => {
    it('debe capitalizar solo la primera letra cuando viene en mayúsculas completas', () => {
      expect(formatGrupo('GRUPO 1')).toBe('Grupo 1');
      expect(formatGrupo('GRUPO 14')).toBe('Grupo 14');
      expect(formatGrupo('GRUPO ÚNICO')).toBe('Grupo único');
    });

    it('debe capitalizar la primera letra cuando viene todo en minúsculas', () => {
      expect(formatGrupo('grupo 2')).toBe('Grupo 2');
      expect(formatGrupo('grupo a')).toBe('Grupo a');
    });

    it('debe mantener mayúscula la primera y minúsculas el resto si ya viene formateado', () => {
      expect(formatGrupo('Grupo 3')).toBe('Grupo 3');
    });

    it('debe devolver cadena vacía ante valores nulos, indefinidos o vacíos', () => {
      expect(formatGrupo(null)).toBe('');
      expect(formatGrupo(undefined)).toBe('');
      expect(formatGrupo('')).toBe('');
      expect(formatGrupo('   ')).toBe('');
    });
  });

  describe('formatTime', () => {
    it('debe extraer correctamente la hora HH:MM', () => {
      expect(formatTime('2026-10-10 11:30:00')).toBe('11:30');
      expect(formatTime('2026-10-10 09:00:00')).toBe('09:00');
    });

    it('debe retornar fallback cuando es nulo o vacío', () => {
      expect(formatTime(null)).toBe('--:--');
      expect(formatTime('')).toBe('--:--');
    });
  });

  describe('formatDateLabel', () => {
    it('debe formatear una fecha válida', () => {
      const result = formatDateLabel('2026-10-10');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('debe retornar la misma cadena si el formato no es YYYY-MM-DD', () => {
      expect(formatDateLabel('invalid-date')).toBe('invalid-date');
    });
  });
});
