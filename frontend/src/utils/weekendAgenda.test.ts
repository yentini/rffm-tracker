import { describe, it, expect } from 'vitest';
import {
  parseDateAndDay,
  extractCategoryName,
  isDateInWeekendWindow,
  extractTeamWeekendMatches,
  extractTeamWeekendMatch,
  processWeekendAgenda,
  WeekendMatchItem,
} from './weekendAgenda';
import { FavoriteTeam, CalendarioResponse } from '../types';

describe('Weekend Agenda Utilities', () => {
  describe('extractCategoryName', () => {
    it('debe identificar categorías clásicas del fútbol base y senior', () => {
      expect(extractCategoryName('PRIMERA CADETE')).toBe('Cadete');
      expect(extractCategoryName('DIVISIÓN DE HONOR CADETE')).toBe('Cadete');
      expect(extractCategoryName('SEGUNDA INFANTIL')).toBe('Infantil');
      expect(extractCategoryName('PREFERENTE ALEVÍN')).toBe('Alevín');
      expect(extractCategoryName('AUTONÓMICA BENJAMÍN')).toBe('Benjamín');
      expect(extractCategoryName('PREBENJAMÍN FÚTBOL 7')).toBe('Prebenjamín');
      expect(extractCategoryName('LIGA NACIONAL JUVENIL')).toBe('Juvenil');
      expect(extractCategoryName('PRIMERA AFICIONADOS')).toBe('Aficionado');
      expect(extractCategoryName('TERCERA FEDERACIÓN')).toBe('Senior');
      expect(extractCategoryName('', 'Getafe CF Cadete B')).toBe('Cadete');
    });
  });

  describe('isDateInWeekendWindow', () => {
    // Martes 8 de octubre de 2024
    const refTuesday = new Date('2024-10-08T12:00:00');

    it('debe descartar partidos del fin de semana anterior', () => {
      // Sábado 5 de octubre de 2024 (fin de semana anterior)
      expect(isDateInWeekendWindow('2024-10-05', refTuesday)).toBe(false);
      // Domingo 6 de octubre de 2024 (fin de semana anterior)
      expect(isDateInWeekendWindow('2024-10-06', refTuesday)).toBe(false);
    });

    it('debe incluir partidos desde el día actual hasta el primer domingo siguiente', () => {
      // Martes 8 (hoy)
      expect(isDateInWeekendWindow('2024-10-08', refTuesday)).toBe(true);
      // Viernes 11
      expect(isDateInWeekendWindow('2024-10-11', refTuesday)).toBe(true);
      // Sábado 12 (fin de semana actual)
      expect(isDateInWeekendWindow('2024-10-12', refTuesday)).toBe(true);
      // Domingo 13 (primer domingo siguiente)
      expect(isDateInWeekendWindow('2024-10-13', refTuesday)).toBe(true);
    });

    it('debe descartar partidos del siguiente fin de semana', () => {
      // Lunes 14
      expect(isDateInWeekendWindow('2024-10-14', refTuesday)).toBe(false);
      // Sábado 19
      expect(isDateInWeekendWindow('2024-10-19', refTuesday)).toBe(false);
    });
  });

  describe('parseDateAndDay', () => {
    it('debe identificar un sábado correctamente', () => {
      // 2024-10-12 fue Sábado
      const res = parseDateAndDay('2024-10-12');
      expect(res.diaSemana).toBe('sabado');
      expect(res.diaSemanaNombre).toBe('Sábado');
    });

    it('debe identificar un domingo correctamente', () => {
      // 2024-10-13 fue Domingo
      const res = parseDateAndDay('2024-10-13');
      expect(res.diaSemana).toBe('domingo');
      expect(res.diaSemanaNombre).toBe('Domingo');
    });

    it('debe manejar fechas con formato DD/MM/YYYY', () => {
      const res = parseDateAndDay('12/10/2024 10:30');
      expect(res.diaSemana).toBe('sabado');
    });

    it('debe manejar fechas nulas o vacías sin fallar', () => {
      const res = parseDateAndDay(null);
      expect(res.diaSemana).toBe('otro');
      expect(res.diaSemanaNombre).toBe('Por determinar');
    });
  });

  describe('extractTeamWeekendMatches & extractTeamWeekendMatch', () => {
    const sampleFav: FavoriteTeam = {
      teamId: 'team-1',
      teamName: 'CD Pozuelo A',
      seasonId: '22',
      seasonName: '2024/2025',
      gameTypeId: '1',
      gameTypeName: 'Fútbol Campo',
      competitionId: 'comp-1',
      competitionName: 'Tercera Federación',
      groupId: 'grp-1',
      groupName: 'Grupo 7',
      savedAt: 123456,
    };

    const sampleCal: CalendarioResponse = {
      temporada: '22',
      tipojuego: '1',
      competicion: 'comp-1',
      grupo: 'grp-1',
      current_round: 1, // Simula que la API aún apunta a la jornada 1 pasada
      total_jornadas: 10,
      rounds: [
        {
          codjornada: 'j1',
          nombre_jornada: 'Jornada 1',
          numero_jornada: 1,
          partidos: [
            {
              codacta: 'acta-antigua',
              codigo_equipo_local: 'team-1',
              equipo_local: 'CD Pozuelo A',
              codigo_equipo_visitante: 'team-old',
              equipo_visitante: 'Rival Anterior',
              campo: 'Valle de las Cañas',
              fecha: '2024-10-05', // Fin de semana anterior
              hora: '11:00',
            },
          ],
        },
        {
          codjornada: 'j2',
          nombre_jornada: 'Jornada 2',
          numero_jornada: 2,
          partidos: [
            {
              codacta: 'acta-555',
              codigo_equipo_local: 'team-1',
              equipo_local: 'CD Pozuelo A',
              codigo_equipo_visitante: 'team-2',
              equipo_visitante: 'Las Rozas CF',
              campo: 'Valle de las Cañas',
              fecha: '2024-10-12', // Este fin de semana
              hora: '11:00',
            },
          ],
        },
      ],
    };

    it('debe descartar partidos del fin de semana anterior y extraer solo el de este fin de semana', () => {
      const refTuesday = new Date('2024-10-08T12:00:00');
      const matches = extractTeamWeekendMatches(sampleFav, sampleCal, refTuesday);
      expect(matches).toHaveLength(1);
      expect(matches[0].codacta).toBe('acta-555');
      expect(matches[0].diaSemana).toBe('sabado');
      expect(matches[0].fechaFormateada).toContain('12');
      expect(matches[0].hora).toBe('11:00');
      expect(matches[0].campo).toBe('Valle de las Cañas');
      expect(matches[0].isLocal).toBe(true);

      const single = extractTeamWeekendMatch(sampleFav, sampleCal, refTuesday);
      expect(single?.codacta).toBe('acta-555');
    });
  });

  describe('processWeekendAgenda (Ordenación y Conflictos)', () => {
    it('debe ordenar sábado antes de domingo y detectar conflicto horario', () => {
      const matches: WeekendMatchItem[] = [
        {
          id: '1',
          codacta: '1',
          favTeamId: 't1',
          favTeamName: 'Equipo Domingo',
          competitionName: 'Comp',
          groupName: 'Grp',
          jornadaNum: 1,
          isLocal: true,
          equipoLocal: 'Equipo Domingo',
          equipoVisitante: 'Rival 1',
          campo: 'Campo A',
          fechaFormateada: '13 oct',
          hora: '10:00',
          diaSemana: 'domingo',
          diaSemanaNombre: 'Domingo',
          timestamp: 2,
        },
        {
          id: '2',
          codacta: '2',
          favTeamId: 't2',
          favTeamName: 'Equipo Sabado Tarde',
          competitionName: 'PRIMERA CADETE',
          groupName: 'Grp',
          jornadaNum: 1,
          isLocal: true,
          equipoLocal: 'Equipo Sabado Tarde',
          equipoVisitante: 'Rival 2',
          campo: 'Campo B',
          fechaFormateada: '12 oct',
          hora: '17:00',
          diaSemana: 'sabado',
          diaSemanaNombre: 'Sábado',
          timestamp: 1,
        },
        {
          id: '3',
          codacta: '3',
          favTeamId: 't3',
          favTeamName: 'Equipo Sabado Manana',
          competitionName: 'SEGUNDA INFANTIL',
          groupName: 'Grp',
          jornadaNum: 1,
          isLocal: false,
          equipoLocal: 'Rival 3',
          equipoVisitante: 'Equipo Sabado Manana',
          campo: 'Campo C',
          fechaFormateada: '12 oct',
          hora: '17:15', // Solapado con el de las 17:00
          diaSemana: 'sabado',
          diaSemanaNombre: 'Sábado',
          timestamp: 1,
        },
      ];

      const processed = processWeekendAgenda(matches);

      // Primero los de sábado (ordenados por hora: 17:00 y 17:15)
      expect(processed[0].favTeamName).toBe('Equipo Sabado Tarde');
      expect(processed[1].favTeamName).toBe('Equipo Sabado Manana');
      // Luego domingo
      expect(processed[2].favTeamName).toBe('Equipo Domingo');

      // Comprobar detección de conflicto horario en sábado con categoría
      expect(processed[0].hasTimeConflict).toBe(true);
      expect(processed[0].conflictDescription).toContain('Infantil');
      expect(processed[1].hasTimeConflict).toBe(true);
      expect(processed[1].conflictDescription).toContain('Cadete');
      expect(processed[2].hasTimeConflict).toBeFalsy();
    });
  });
});
