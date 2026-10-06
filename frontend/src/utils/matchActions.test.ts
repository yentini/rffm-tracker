import { describe, it, expect } from 'vitest';
import {
  parseMatchDateTime,
  getGoogleMapsUrl,
  getGoogleCalendarUrl,
  buildIcsContent,
} from './matchActions';

describe('matchActions utility', () => {
  describe('parseMatchDateTime', () => {
    it('debe parsear fechas en formato DD-MM-YYYY y hora HH:mm', () => {
      const result = parseMatchDateTime('26-09-2026', '10:45');
      expect(result).not.toBeNull();
      expect(result?.start.getFullYear()).toBe(2026);
      expect(result?.start.getMonth()).toBe(8); // Septiembre es 8
      expect(result?.start.getDate()).toBe(26);
      expect(result?.start.getHours()).toBe(10);
      expect(result?.start.getMinutes()).toBe(45);
      // El fin debe ser 105 minutos después (12:30)
      expect(result?.end.getHours()).toBe(12);
      expect(result?.end.getMinutes()).toBe(30);
    });

    it('debe parsear fechas en formato ISO YYYY-MM-DD', () => {
      const result = parseMatchDateTime('2026-10-12', '18:00');
      expect(result).not.toBeNull();
      expect(result?.start.getFullYear()).toBe(2026);
      expect(result?.start.getMonth()).toBe(9); // Octubre
      expect(result?.start.getDate()).toBe(12);
      expect(result?.start.getHours()).toBe(18);
    });

    it('debe retornar null para fechas vacías o inválidas', () => {
      expect(parseMatchDateTime('', '10:00')).toBeNull();
      expect(parseMatchDateTime(null, '10:00')).toBeNull();
      expect(parseMatchDateTime('fecha-invalida', '10:00')).toBeNull();
    });
  });

  describe('getGoogleMapsUrl', () => {
    it('debe retornar una url de Google Maps con la query del campo deportivo', () => {
      const url = getGoogleMapsUrl('Polideportivo Valdelasfuentes');
      expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
      expect(url).toContain('Valdelasfuentes');
    });

    it('debe incluir un fallback si el campo viene vacío', () => {
      const url = getGoogleMapsUrl('');
      expect(url).toContain('Campo+de+Futbol+Madrid');
    });
  });

  describe('getGoogleCalendarUrl', () => {
    it('debe construir la URL con título, fechas y ubicación', () => {
      const url = getGoogleCalendarUrl({
        local: 'Real Madrid B',
        visitante: 'Atlético Madrileño',
        fecha: '2026-10-15',
        hora: '12:00',
        campo: 'Ciudad Deportiva Real Madrid',
        competicion: 'Tercera Federación',
      });

      expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
      expect(url).toContain('Real+Madrid+B+vs+Atl');
      expect(url).toContain('Ciudad+Deportiva');
      expect(url).toContain('dates=');
    });
  });

  describe('buildIcsContent', () => {
    it('debe generar el formato VCALENDAR estándar con resumen, ubicación y fecha', () => {
      const content = buildIcsContent({
        local: 'Pozuelo CF',
        visitante: 'Las Rozas CF',
        fecha: '2026-10-18',
        hora: '11:00',
        campo: 'Polideportivo Valle de las Cañas',
        competicion: 'Preferente Madrid',
      });

      expect(content).toContain('BEGIN:VCALENDAR');
      expect(content).toContain('SUMMARY:Pozuelo CF vs Las Rozas CF');
      expect(content).toContain('LOCATION:Polideportivo Valle de las Cañas');
      expect(content).toContain('END:VCALENDAR');
    });
  });
});
