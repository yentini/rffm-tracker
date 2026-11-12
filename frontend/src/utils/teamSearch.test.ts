import { describe, it, expect } from 'vitest';
import { matchCategory, CATEGORY_CHIPS } from './teamSearch';
import { DeduceTeamResult } from '../types';

describe('teamSearch utils - matchCategory', () => {
  const baseTeam: DeduceTeamResult = {
    codigo_club: '100',
    nombre_club: 'C.F. Pozuelo',
    codigo_equipo: '200',
    nombre_equipo: 'Pozuelo A',
    categoria: 'Infantil',
    codigo_competicion: '300',
    nombre_competicion: 'Primera Infantil Grupo 1',
    codigo_grupo: '400',
    nombre_grupo: 'Grupo 1',
    codigo_temporada: '22',
    codigo_tipo_juego: '1',
  };

  it('matches all categories when "Todos" is selected', () => {
    expect(matchCategory(baseTeam, 'Todos')).toBe(true);
    expect(matchCategory({ ...baseTeam, categoria: 'Cadete' }, 'Todos')).toBe(true);
    expect(matchCategory({ ...baseTeam, categoria: 'Senior' }, 'Todos')).toBe(true);
  });

  it('correctly matches Infantil teams', () => {
    expect(matchCategory(baseTeam, 'Infantil')).toBe(true);
    expect(
      matchCategory(
        {
          ...baseTeam,
          categoria: 'Cadete',
          nombre_equipo: 'Pozuelo Cadete',
          nombre_competicion: 'Primera Cadete Grupo 1',
        },
        'Infantil'
      )
    ).toBe(false);
  });

  it('correctly matches Cadete and Juvenil teams', () => {
    const cadeteTeam: DeduceTeamResult = { ...baseTeam, categoria: 'Cadete Preferente', nombre_equipo: 'Pozuelo Cadete B' };
    const juvenilTeam: DeduceTeamResult = { ...baseTeam, categoria: 'Juvenil Autonómica', nombre_equipo: 'Pozuelo Juvenil A' };

    expect(matchCategory(cadeteTeam, 'Cadete')).toBe(true);
    expect(matchCategory(cadeteTeam, 'Juvenil')).toBe(false);

    expect(matchCategory(juvenilTeam, 'Juvenil')).toBe(true);
    expect(matchCategory(juvenilTeam, 'Cadete')).toBe(false);
  });

  it('correctly distinguishes Benjamín from Prebenjamín', () => {
    const benjaminTeam: DeduceTeamResult = { ...baseTeam, categoria: 'Benjamín F-7', nombre_equipo: 'Pozuelo Benjamín A' };
    const prebenjaminTeam: DeduceTeamResult = { ...baseTeam, categoria: 'Prebenjamín F-7', nombre_equipo: 'Pozuelo Prebenjamín B' };

    expect(matchCategory(benjaminTeam, 'Benjamín')).toBe(true);
    expect(matchCategory(benjaminTeam, 'Prebenjamín')).toBe(false);

    expect(matchCategory(prebenjaminTeam, 'Prebenjamín')).toBe(true);
    expect(matchCategory(prebenjaminTeam, 'Benjamín')).toBe(false);
  });

  it('correctly matches Senior teams with various naming conventions', () => {
    const senior1: DeduceTeamResult = { ...baseTeam, categoria: 'Aficionados', nombre_equipo: 'Pozuelo Senior' };
    const senior2: DeduceTeamResult = { ...baseTeam, categoria: 'Tercera Division', nombre_equipo: 'Pozuelo de Alarcón' };
    const senior3: DeduceTeamResult = { ...baseTeam, categoria: 'Preferente Aficionados', nombre_equipo: 'Pozuelo B' };

    expect(matchCategory(senior1, 'Senior')).toBe(true);
    expect(matchCategory(senior2, 'Senior')).toBe(true);
    expect(matchCategory(senior3, 'Senior')).toBe(true);
    expect(matchCategory(baseTeam, 'Senior')).toBe(false);
  });

  it('includes expected default category chips', () => {
    expect(CATEGORY_CHIPS).toContain('Todos');
    expect(CATEGORY_CHIPS).toContain('Senior');
    expect(CATEGORY_CHIPS).toContain('Juvenil');
    expect(CATEGORY_CHIPS).toContain('Cadete');
    expect(CATEGORY_CHIPS).toContain('Infantil');
    expect(CATEGORY_CHIPS).toContain('Alevín');
    expect(CATEGORY_CHIPS).toContain('Benjamín');
    expect(CATEGORY_CHIPS).toContain('Prebenjamín');
  });
});
