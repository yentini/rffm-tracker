import { describe, it, expect } from 'vitest';
import { computeRunningScores, BaseTimelineEvent } from './timeline';

describe('computeRunningScores (Lógica de marcador progresivo en vivo)', () => {
  it('debe calcular correctamente el marcador progresivo en orden cronológico', () => {
    const rawEvents: BaseTimelineEvent[] = [
      { minuto: 12, minutoRaw: '12', equipo: 'local', tipo: 'gol' },
      { minuto: 25, minutoRaw: '25', equipo: 'visitante', tipo: 'tarjeta' },
      { minuto: 40, minutoRaw: '40', equipo: 'visitante', tipo: 'gol' },
      { minuto: 70, minutoRaw: '70', equipo: 'local', tipo: 'gol' },
      { minuto: 88, minutoRaw: '88', equipo: 'local', tipo: 'gol' },
    ];

    const result = computeRunningScores(rawEvents);

    expect(result[0].marcadorMomento).toBe('1 - 0');
    expect(result[1].marcadorMomento).toBeUndefined(); // Tarjeta sin marcador
    expect(result[2].marcadorMomento).toBe('1 - 1');
    expect(result[3].marcadorMomento).toBe('2 - 1');
    expect(result[4].marcadorMomento).toBe('3 - 1');
  });

  it('debe retornar lista vacía si no hay eventos', () => {
    expect(computeRunningScores([])).toEqual([]);
  });

  it('debe no asignar marcadorMomento si solo hay tarjetas', () => {
    const events: BaseTimelineEvent[] = [
      { minuto: 10, minutoRaw: '10', equipo: 'local', tipo: 'tarjeta' },
      { minuto: 20, minutoRaw: '20', equipo: 'visitante', tipo: 'tarjeta' },
    ];
    const res = computeRunningScores(events);
    expect(res.every((e) => e.marcadorMomento === undefined)).toBe(true);
  });
});
