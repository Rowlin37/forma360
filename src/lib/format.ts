/**
 * Utilidades de formato métrico e internacionalización en español (es-ES, Europe/Madrid).
 */

export const DAY_NAMES_ES: readonly string[] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const DAY_SHORT_ES: readonly string[] = [
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
  'Dom',
];

/**
 * Formatea un número usando coma decimal española y separador de miles cuando procede.
 */
export function formatEsNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Convierte cadenas introducidas con coma o punto decimal ("89,4" o "89.4") en número.
 */
export function parseMetricInput(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const cleaned = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Devuelve la fecha local actual `YYYY-MM-DD` en la zona horaria indicada (por defecto Europe/Madrid).
 */
export function todayIsoInTimezone(timezone = 'Europe/Madrid', now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
    const m = parts.find((p) => p.type === 'month')?.value ?? '10';
    const d = parts.find((p) => p.type === 'day')?.value ?? '22';
    return `${y}-${m}-${d}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * Formatea una fecha `YYYY-MM-DD` al estilo español ("22 oct 2026" o "jueves, 22 oct").
 */
export function formatEsDate(isoDate: string, includeWeekday = false): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    ...(includeWeekday ? { weekday: 'short' } : {}),
    day: 'numeric',
    month: 'short',
    year: includeWeekday ? undefined : 'numeric',
  }).format(date);
}

/**
 * Devuelve el día de la semana ISO (1 = Lunes ... 7 = Domingo) para `YYYY-MM-DD`.
 */
export function getIsoDayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return 1;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const jsDay = date.getUTCDay(); // 0=Dom..6=Sab
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Suma o resta días a una fecha `YYYY-MM-DD` de forma determinista.
 */
export function addDaysIso(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

/**
 * Calcula el lunes ISO (`YYYY-MM-DD`) de la semana que contiene `isoDate`.
 */
export function startOfIsoWeek(isoDate: string): string {
  const dow = getIsoDayOfWeek(isoDate);
  return addDaysIso(isoDate, -(dow - 1));
}

/**
 * Genera un identificador único seguro para clientes y claves anti-duplicado.
 */
export function generateId(prefix = 'f360'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
