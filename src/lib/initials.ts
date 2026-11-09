/**
 * Iniciales para el avatar de la cuenta: "Ana Agente" -> "AA". Cae al usuario
 * si no hay nombre, y a "?" si tampoco hay usuario.
 */
export function initials(fullName?: string | null, username?: string | null): string {
  const source = fullName?.trim() || username?.trim() || '';
  const words = source.split(/\s+/).filter(Boolean).slice(0, 2);

  if (words.length === 0) return '?';
  return words.map((word) => word.slice(0, 1).toUpperCase()).join('');
}
