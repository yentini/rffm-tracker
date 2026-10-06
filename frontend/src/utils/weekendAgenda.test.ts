import { describe, it, expect } from 'vitest';
import {
  parseDateAndDay,
  extractTeamWeekendMatch,
  processWeekendAgenda,
  WeekendMatchItem,
} from './weekendAgenda';
import { FavoriteTeam, CalendarioResponse } from '../types';

describe('Weekend Agenda Utilities', () => {
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

  describe('extractTeamWeekendMatch', () => {
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
      current_round: 2,
      total_jornadas: 10,
      rounds: [
        {
          codjornada: 'j1',
          nombre_jornada: 'Jornada 1',
          numero_jornada: 1,
          partidos: [],
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
              fecha: '2024-10-12',
              hora: '11:00',
            },
          ],
        },
      ],
    };

    it('debe extraer el partido de la jornada actual para el equipo favorito', () => {
      const match = extractTeamWeekendMatch(sampleFav, sampleCal);
      expect(match).not.toBeNull();
      expect(match?.codacta).toBe('acta-555');
      expect(match?.diaSemana).toBe('sabado');
      expect(match?.hora).toBe('11:00');
      expect(match?.campo).toBe('Valle de las Cañas');
      expect(match?.isLocal).toBe(true);
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
          competitionName: 'Comp',
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
          competitionName: 'Comp',
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

      // Comprobar detección de conflicto horario en sábado
      expect(processed[0].hasTimeConflict).toBe(true);
      expect(processed[1].hasTimeConflict).toBe(true);
      expect(processed[2].hasTimeConflict).toBeFalsy();
    });
  });
});
