import { CalendarioResponse, FavoriteTeam } from '../types';

export interface WeekendMatchItem {
  id: string;
  codacta: string;
  favTeamId: string;
  favTeamName: string;
  favTeamShield?: string | null;
  competitionName: string;
  categoryName?: string;
  groupName: string;
  jornadaNum: number;
  isLocal: boolean;

  // Equipos del encuentro
  equipoLocal: string;
  escudoLocal?: string | null;
  golesLocal?: string | null;
  equipoVisitante: string;
  escudoVisitante?: string | null;
  golesVisitante?: string | null;

  // Ubicación y horario
  campo?: string | null;
  codigoCampo?: string | null;
  fechaRaw?: string | null;
  fechaFormateada: string;
  hora: string;
  diaSemana: 'sabado' | 'domingo' | 'otro';
  diaSemanaNombre: string; // "Sábado", "Domingo", "Viernes", etc.
  timestamp: number;

  // Conflictos de horario
  hasTimeConflict?: boolean;
  conflictDescription?: string;
}

/**
 * Parsea una fecha en formato YYYY-MM-DD o DD/MM/YYYY y extrae el día de la semana.
 */
export function parseDateAndDay(fechaStr?: string | null): {
  diaSemana: 'sabado' | 'domingo' | 'otro';
  diaSemanaNombre: string;
  fechaFormateada: string;
  timestamp: number;
} {
  if (!fechaStr || !fechaStr.trim()) {
    return {
      diaSemana: 'otro',
      diaSemanaNombre: 'Por determinar',
      fechaFormateada: 'Fecha por definir',
      timestamp: 0,
    };
  }

  const clean = fechaStr.trim().split(' ')[0].replace(/\//g, '-');
  const parts = clean.split('-');

  let year = 0;
  let month = 0;
  let day = 0;

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
  }

  if (year > 0 && year < 100) {
    year += 2000;
  }

  const d = new Date(year, month, day, 0, 0, 0, 0);
  if (isNaN(d.getTime())) {
    return {
      diaSemana: 'otro',
      diaSemanaNombre: 'Otro día',
      fechaFormateada: clean,
      timestamp: 0,
    };
  }

  const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
  let diaSemana: 'sabado' | 'domingo' | 'otro' = 'otro';
  let diaSemanaNombre = 'Otro día';

  if (dayOfWeek === 6) {
    diaSemana = 'sabado';
    diaSemanaNombre = 'Sábado';
  } else if (dayOfWeek === 0) {
    diaSemana = 'domingo';
    diaSemanaNombre = 'Domingo';
  } else if (dayOfWeek === 5) {
    diaSemanaNombre = 'Viernes';
  }

  const fechaFormateada = d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });

  return {
    diaSemana,
    diaSemanaNombre,
    fechaFormateada,
    timestamp: d.getTime(),
  };
}

/**
 * Comprueba si una fecha se encuentra en la ventana activa de la agenda:
 * Desde el día actual (00:00:00) hasta el primer domingo siguiente (23:59:59).
 */
export function isDateInWeekendWindow(
  matchDateStr?: string | null,
  referenceDate?: Date
): boolean {
  if (!matchDateStr) return false;
  const parsed = parseDateAndDay(matchDateStr);
  if (!parsed.timestamp) return false;

  const now = referenceDate || new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  ).getTime();

  const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  // Si hoy es domingo (0), el primer domingo siguiente cubre hoy hasta las 23:59:59.
  // Si hoy es lunes a sábado (1 a 6), el primer domingo siguiente es en (7 - dayOfWeek) días.
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endOfNextSunday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSunday,
    23,
    59,
    59,
    999
  ).getTime();

  return parsed.timestamp >= startOfToday && parsed.timestamp <= endOfNextSunday;
}

/**
 * Extrae la categoría de edad (ej. Cadete, Infantil, Juvenil, etc.)
 * a partir del nombre de la competición o del equipo.
 */
export function extractCategoryName(competitionName?: string, teamName?: string): string {
  const text = `${competitionName || ''} ${teamName || ''}`.toLowerCase();

  if (text.includes('prebenjamin') || text.includes('prebenjamín')) return 'Prebenjamín';
  if (text.includes('benjamin') || text.includes('benjamín')) return 'Benjamín';
  if (text.includes('alevin') || text.includes('alevín')) return 'Alevín';
  if (text.includes('infantil')) return 'Infantil';
  if (text.includes('cadete')) return 'Cadete';
  if (text.includes('juvenil')) return 'Juvenil';
  if (text.includes('debutante')) return 'Debutante';
  if (text.includes('aficionado') || text.includes('aficionados')) return 'Aficionado';
  if (text.includes('senior') || text.includes('sénior') || text.includes('federacion') || text.includes('federación')) return 'Senior';
  if (text.includes('veteran')) return 'Veteranos';
  if (text.includes('femenin')) return 'Femenino';

  return competitionName?.trim() || '';
}

/**
 * Extrae todos los partidos del equipo favorito que se disputan dentro de la ventana:
 * desde el día actual hasta el primer domingo siguiente.
 */
export function extractTeamWeekendMatches(
  fav: FavoriteTeam,
  calendario: CalendarioResponse,
  referenceDate?: Date
): WeekendMatchItem[] {
  if (!calendario.rounds || calendario.rounds.length === 0) return [];

  const foundMatches: WeekendMatchItem[] = [];

  for (const round of calendario.rounds) {
    for (const match of round.partidos) {
      const isLocal = match.codigo_equipo_local === fav.teamId;
      const isVisitante = match.codigo_equipo_visitante === fav.teamId;

      if (!isLocal && !isVisitante) continue;

      if (isDateInWeekendWindow(match.fecha, referenceDate)) {
        const parsed = parseDateAndDay(match.fecha);
        const horaLimpia = match.hora?.trim() || '--:--';
        const categoryName = extractCategoryName(fav.competitionName, fav.teamName);

        foundMatches.push({
          id: `${fav.teamId}-${match.codacta || round.numero_jornada}`,
          codacta: match.codacta || '',
          favTeamId: fav.teamId,
          favTeamName: fav.teamName,
          favTeamShield: fav.teamShield,
          competitionName: fav.competitionName,
          categoryName,
          groupName: fav.groupName,
          jornadaNum: round.numero_jornada,
          isLocal,
          equipoLocal: match.equipo_local,
          escudoLocal: match.escudo_equipo_local,
          golesLocal: match.goles_local,
          equipoVisitante: match.equipo_visitante,
          escudoVisitante: match.escudo_equipo_visitante,
          golesVisitante: match.goles_visitante,
          campo: match.campo,
          codigoCampo: match.codigo_campo,
          fechaRaw: match.fecha,
          fechaFormateada: parsed.fechaFormateada,
          hora: horaLimpia,
          diaSemana: parsed.diaSemana,
          diaSemanaNombre: parsed.diaSemanaNombre,
          timestamp: parsed.timestamp,
        });
      }
    }
  }

  return foundMatches;
}

/**
 * Función de compatibilidad: extrae el primer partido del fin de semana (si existe).
 */
export function extractTeamWeekendMatch(
  fav: FavoriteTeam,
  calendario: CalendarioResponse,
  referenceDate?: Date
): WeekendMatchItem | null {
  const matches = extractTeamWeekendMatches(fav, calendario, referenceDate);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Ordena y detecta solapamientos / coincidencias de horario entre los partidos de la agenda.
 */
export function processWeekendAgenda(matches: WeekendMatchItem[]): WeekendMatchItem[] {
  // Ordenar: primero sábado, luego domingo, luego otros; dentro de cada día, por hora
  const sorted = [...matches].sort((a, b) => {
    // Orden de día: sábado (1), domingo (2), otro (3)
    const dayOrder = (d: string) => (d === 'sabado' ? 1 : d === 'domingo' ? 2 : 3);
    const orderDiff = dayOrder(a.diaSemana) - dayOrder(b.diaSemana);
    if (orderDiff !== 0) return orderDiff;

    // Si ambos son sábado o domingo, ordenar por hora
    if (a.hora && b.hora && a.hora !== '--:--' && b.hora !== '--:--') {
      return a.hora.localeCompare(b.hora);
    }
    return a.favTeamName.localeCompare(b.favTeamName);
  });

  // Detectar conflictos horarios (partidos el mismo día a horas muy próximas o iguales)
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const m1 = sorted[i];
      const m2 = sorted[j];

      // Mismo día con hora válida
      if (
        m1.diaSemana === m2.diaSemana &&
        m1.diaSemana !== 'otro' &&
        m1.hora !== '--:--' &&
        m2.hora !== '--:--'
      ) {
        const [h1, min1] = m1.hora.split(':').map((n) => parseInt(n, 10) || 0);
        const [h2, min2] = m2.hora.split(':').map((n) => parseInt(n, 10) || 0);
        const minutes1 = h1 * 60 + min1;
        const minutes2 = h2 * 60 + min2;

        const diffMinutes = Math.abs(minutes1 - minutes2);
        if (diffMinutes < 90) {
          const cat1 = m1.categoryName || extractCategoryName(m1.competitionName, m1.favTeamName);
          const cat2 = m2.categoryName || extractCategoryName(m2.competitionName, m2.favTeamName);
          const tag1 = cat1 ? ` (${cat1})` : '';
          const tag2 = cat2 ? ` (${cat2})` : '';

          m1.hasTimeConflict = true;
          const msg1 = `${m2.favTeamName}${tag2} a las ${m2.hora}`;
          m1.conflictDescription = m1.conflictDescription
            ? `${m1.conflictDescription}, y con ${msg1}`
            : `Coincidencia horaria con ${msg1}`;

          m2.hasTimeConflict = true;
          const msg2 = `${m1.favTeamName}${tag1} a las ${m1.hora}`;
          m2.conflictDescription = m2.conflictDescription
            ? `${m2.conflictDescription}, y con ${msg2}`
            : `Coincidencia horaria con ${msg2}`;
        }
      }
    }
  }

  return sorted;
}
