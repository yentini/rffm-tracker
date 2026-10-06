/**
 * Utilidades para acciones de partidos y recintos:
 * - Direcciones y navegación («Cómo llegar» en Google Maps)
 * - Añadir eventos a calendario (Google Calendar y descarga .ics para Apple/Outlook)
 */

interface MatchCalendarEventParams {
  local: string;
  visitante: string;
  fecha?: string | null;
  hora?: string | null;
  campo?: string | null;
  competicion?: string | null;
}

/**
 * Parsea fechas con formatos comunes de la RFFM:
 * - DD-MM-YYYY o DD/MM/YYYY (ej: "26-09-2026")
 * - YYYY-MM-DD (ej: "2026-09-26")
 * - Con o sin hora en el string de fecha ("2026-09-26 10:45:00")
 * Retorna objetos Date para inicio y fin estimado (duración aprox: 105 minutos).
 */
export function parseMatchDateTime(
  fecha?: string | null,
  hora?: string | null
): { start: Date; end: Date } | null {
  if (!fecha || !fecha.trim()) return null;

  const cleanFecha = fecha.trim();
  let year = 0;
  let month = 0;
  let day = 0;

  // Caso: Formato ISO o con guiones "YYYY-MM-DD"
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(cleanFecha)) {
    const parts = cleanFecha.split(/[-/]/);
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2].slice(0, 2), 10);
  } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(cleanFecha)) {
    // Caso: Formato español "DD-MM-YYYY" o "DD/MM/YYYY"
    const parts = cleanFecha.split(/[-/]/);
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2].slice(0, 4), 10);
  } else {
    // Intento con Date.parse nativo
    const parsed = new Date(cleanFecha);
    if (isNaN(parsed.getTime())) return null;
    year = parsed.getFullYear();
    month = parsed.getMonth();
    day = parsed.getDate();
  }

  let hours = 10;
  let minutes = 0;

  if (hora && /^\d{1,2}:\d{2}/.test(hora.trim())) {
    const [h, m] = hora.trim().split(':');
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10);
  } else if (cleanFecha.includes(':')) {
    // Si la hora venía embebida en la fecha (ej: "2026-09-26 10:45:00")
    const match = cleanFecha.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
    }
  }

  const start = new Date(year, month, day, hours, minutes, 0);
  if (isNaN(start.getTime())) return null;

  // Duración estimada de 1h 45m (105 min) para el partido
  const end = new Date(start.getTime() + 105 * 60 * 1000);

  return { start, end };
}

/**
 * Genera la URL para abrir la navegación hacia el recinto deportivo en Google Maps.
 */
export function getGoogleMapsUrl(campo?: string | null): string {
  if (!campo || !campo.trim()) {
    return 'https://www.google.com/maps/search/?api=1&query=Campo+de+Futbol+Madrid';
  }
  const cleanCampo = campo.trim();
  const query = cleanCampo.toLowerCase().includes('madrid')
    ? cleanCampo
    : `${cleanCampo}, Madrid`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Formatea un Date a formato compacto UTC para calendarios (YYYYMMDDTHHmmssZ).
 */
function formatUtcForCalendar(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Genera una URL directa para crear el evento en Google Calendar (Web).
 */
export function getGoogleCalendarUrl(params: MatchCalendarEventParams): string {
  const { local, visitante, fecha, hora, campo, competicion } = params;
  const dates = parseMatchDateTime(fecha, hora);

  const title = `${local} vs ${visitante}`;
  const details = [
    'Partido oficial RFFM',
    competicion ? `Competición: ${competicion}` : '',
    hora ? `Hora: ${hora}` : '',
    campo ? `Campo: ${campo}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const location = campo ? (campo.toLowerCase().includes('madrid') ? campo : `${campo}, Madrid`) : '';

  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const query = new URLSearchParams({
    text: title,
    details: details,
    location: location,
  });

  if (dates) {
    query.set(
      'dates',
      `${formatUtcForCalendar(dates.start)}/${formatUtcForCalendar(dates.end)}`
    );
  }

  return `${baseUrl}&${query.toString()}`;
}

/**
 * Construye el contenido en formato iCalendar (.ics) como cadena de texto.
 */
export function buildIcsContent(params: MatchCalendarEventParams): string {
  const { local, visitante, fecha, hora, campo, competicion } = params;
  const dates = parseMatchDateTime(fecha, hora);

  const title = `${local} vs ${visitante}`;
  const location = campo ? (campo.toLowerCase().includes('madrid') ? campo : `${campo}, Madrid`) : '';
  const description = [
    'Partido oficial de la Real Federación de Fútbol de Madrid (RFFM).',
    competicion ? `Competición: ${competicion}` : '',
    hora ? `Hora de convocatoria: ${hora}` : '',
  ]
    .filter(Boolean)
    .join('\\n');

  const dtStart = dates ? formatUtcForCalendar(dates.start) : formatUtcForCalendar(new Date());
  const dtEnd = dates
    ? formatUtcForCalendar(dates.end)
    : formatUtcForCalendar(new Date(Date.now() + 105 * 60 * 1000));
  const dtStamp = formatUtcForCalendar(new Date());
  const uid = `rffm-match-${Date.now()}-${Math.floor(Math.random() * 10000)}@rffm-tracker`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RFFM Tracker//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Genera y descarga un archivo estándar iCalendar (.ics) compatible con Apple Calendar,
 * Google Calendar, Outlook y dispositivos móviles (iOS/Android).
 */
export function downloadIcsFile(params: MatchCalendarEventParams): void {
  if (typeof document === 'undefined') return;

  const { local, visitante } = params;
  const icsContent = buildIcsContent(params);

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `partido-${local.replace(/\s+/g, '_')}_vs_${visitante.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
