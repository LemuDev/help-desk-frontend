import type { TicketPriority, TicketStatus } from '@/types';

/** Los enums del backend van en ingles; esto es lo que se ve en la UI. */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En curso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

/**
 * Clases de NativeWind para la pastilla de cada valor. Van fuera de
 * `tailwind.config.js` a proposito: son colores de estado, no del tema, y la
 * paleta por defecto de Tailwind ya los trae con su variante oscura.
 */
export type BadgeTone = { container: string; text: string };

export const TICKET_STATUS_TONES: Record<TicketStatus, BadgeTone> = {
  open: { container: 'bg-sky-500/15', text: 'text-sky-700 dark:text-sky-300' },
  in_progress: { container: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300' },
  resolved: { container: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300' },
  closed: { container: 'bg-zinc-500/15', text: 'text-zinc-600 dark:text-zinc-300' },
};

export const TICKET_PRIORITY_TONES: Record<TicketPriority, BadgeTone> = {
  low: { container: 'bg-zinc-500/15', text: 'text-zinc-600 dark:text-zinc-300' },
  normal: { container: 'bg-sky-500/15', text: 'text-sky-700 dark:text-sky-300' },
  high: { container: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-300' },
  urgent: { container: 'bg-red-500/15', text: 'text-red-700 dark:text-red-300' },
};