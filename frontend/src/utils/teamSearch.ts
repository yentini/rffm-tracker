import { DeduceTeamResult } from '../types';

export const CATEGORY_CHIPS = [
  'Todos',
  'Senior',
  'Juvenil',
  'Cadete',
  'Infantil',
  'Alevín',
  'Benjamín',
  'Prebenjamín',
] as const;

export type CategoryChip = (typeof CATEGORY_CHIPS)[number];

/**
 * Filtra equipos deducidos según la categoría seleccionada (ej. Senior, Juvenil, Infantil, etc.).
 */
export function matchCategory(team: DeduceTeamResult, cat: string): boolean {
  if (cat === 'Todos') return true;
  const text = `${team.categoria || ''} ${team.nombre_equipo || ''} ${team.nombre_competicion || ''}`.toLowerCase();
  const cLow = cat.toLowerCase();

  if (cLow === 'senior') {
    return (
      text.includes('senior') ||
      text.includes('sénior') ||
      text.includes('aficionado') ||
      text.includes('tercera federacion') ||
      text.includes('tercera division')
    );
  }
  if (cLow === 'juvenil') return text.includes('juvenil');
  if (cLow === 'cadete') return text.includes('cadete');
  if (cLow === 'infantil') return text.includes('infantil');
  if (cLow === 'alevín' || cLow === 'alevin') {
    return text.includes('alevin') || text.includes('alevín') || text.includes('alev-') || text.includes('alev ');
  }
  if (cLow === 'benjamín' || cLow === 'benjamin') {
    return (
      (text.includes('benjamin') || text.includes('benjamín')) &&
      !text.includes('prebenjamin') &&
      !text.includes('prebenjamín')
    );
  }
  if (cLow === 'prebenjamín' || cLow === 'prebenjamin') {
    return text.includes('prebenjamin') || text.includes('prebenjamín');
  }

  return text.includes(cLow);
}
