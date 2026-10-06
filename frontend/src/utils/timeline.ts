/**
 * Utilidades para el cálculo y formateo de la cronología de eventos de un partido oficial.
 */

export interface BaseTimelineEvent {
  minuto: number;
  minutoRaw: string;
  equipo: 'local' | 'visitante';
  tipo: 'gol' | 'tarjeta';
  marcadorMomento?: string;
}

/**
 * Calcula el marcador acumulado progresivo para cada evento de gol
 * respetando el orden cronológico del encuentro.
 *
 * @param events Lista de eventos ordenada cronológicamente por minuto
 * @returns Lista de eventos con marcadorMomento asignado a los goles
 */
export function computeRunningScores<T extends BaseTimelineEvent>(events: T[]): T[] {
  let runningLocal = 0;
  let runningVisitor = 0;

  return events.map((ev) => {
    if (ev.tipo === 'gol') {
      if (ev.equipo === 'local') {
        runningLocal += 1;
      } else {
        runningVisitor += 1;
      }
      return {
        ...ev,
        marcadorMomento: `${runningLocal} - ${runningVisitor}`,
      };
    }
    return ev;
  });
}
