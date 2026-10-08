/**
 * Utilidades de formateo para la visualización de agendas e información de campos y sedes.
 */

/**
 * Formatea una fecha en formato YYYY-MM-DD a una etiqueta legible en español (ej. "sáb, 10 oct").
 */
export const formatDateLabel = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }
  } catch {
    // Ignorar fallback
  }
  return dateStr;
};

/**
 * Extrae la hora en formato HH:MM desde un string de fecha (ej. "2026-10-10 10:30:00" -> "10:30").
 */
export const formatTime = (fechaStr?: string | null): string => {
  if (!fechaStr) return '--:--';
  const parts = fechaStr.split(' ');
  if (parts.length > 1) {
    return parts[1].substring(0, 5);
  }
  return fechaStr;
};

/**
 * Formatea el texto del grupo para que únicamente la primera letra sea mayúscula.
 * Evita el exceso de ancho generado por nombres en mayúsculas como "GRUPO 1".
 * Ejemplos:
 *  - "GRUPO 1" -> "Grupo 1"
 *  - "grupo único" -> "Grupo único"
 */
export const formatGrupo = (grupo?: string | null): string => {
  if (!grupo || !grupo.trim()) return '';
  const trimmed = grupo.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};
