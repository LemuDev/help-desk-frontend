/** Una linea del detalle, ya lista para pintar. */
export type DetailField = {
  label: string;
  value: string;
};

export type DetailFieldOptions = {
  /** Etiqueta por campo. Lo que no este aqui se etiqueta con el nombre del campo. */
  labels?: Record<string, string>;
  /** Campos que no se muestran. */
  hide?: string[];
  /** Como pintar un campo concreto, p.ej. una lista de objetos que no se lee bien en JSON. */
  format?: Record<string, (value: unknown) => string>;
};

/**
 * Convierte cualquier objeto de la API en lineas `etiqueta: valor`.
 *
 * Es lo que hace "automatico" el detalle de `ItemList`: no hay que escribir una
 * pantalla por recurso, se pinta lo que venga. `labels` y `hide` estan para
 * ajustar el resultado sin perder eso.
 */
export function toDetailFields(
  data: unknown,
  { labels = {}, hide = [], format = {} }: DetailFieldOptions = {},
): DetailField[] {
  if (typeof data !== 'object' || data === null) return [];

  return Object.entries(data)
    .filter(([key]) => !hide.includes(key))
    .map(([key, value]) => ({
      label: labels[key] ?? labelFromKey(key),
      value: format[key] ? format[key](value) : formatValue(value),
    }));
}

/** `full_name` -> `Full name`. Los campos del backend estan en ingles. */
function labelFromKey(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Un ISO 8601 como los que devuelve FastAPI para `datetime`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';

  if (Array.isArray(value)) {
    return value.length === 0 ? '—' : value.map(formatValue).join(', ');
  }

  if (typeof value === 'string' && ISO_DATE.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }

  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
