import { Action, Resource } from '@/types';
import type { Permission } from '@/types';

/**
 * Lo que necesita el formulario de roles (`RoleFormModal`) y su detalle: las
 * etiquetas de recursos y acciones, la rejilla de permisos por recurso y el
 * slug.
 */

/** Los enums del backend van en ingles; esto es lo que se ve en la UI. */
export const RESOURCE_LABELS: Record<Resource, string> = {
  ticket: 'Tickets',
  comment: 'Comentarios',
  attachment: 'Adjuntos',
  category: 'Categorias',
  product: 'Productos',
  user: 'Usuarios',
  role: 'Roles',
  report: 'Reportes',
  settings: 'Ajustes',
  company: 'Empresas',
  branch: 'Sucursales',
};

export const ACTION_LABELS: Record<Action, string> = {
  create: 'Crear',
  read: 'Ver',
  update: 'Editar',
  delete: 'Borrar',
  assign: 'Asignar',
  close: 'Cerrar',
  export: 'Exportar',
  manage: 'Todo',
};

/** Una fila de la rejilla: un recurso con sus permisos, `manage` primero. */
export type PermissionGroup = {
  resource: Resource;
  /** Ausente si el catalogo no trae `<recurso>:manage`. */
  manage: Permission | undefined;
  actions: Permission[];
};

// El orden de los enums: `GET /permissions` ordena por texto y dejaria
// `assign` antes que `read`.
const RESOURCE_ORDER = Object.values(Resource);
const ACTION_ORDER = Object.values(Action);

export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  return RESOURCE_ORDER.flatMap((resource) => {
    const own = permissions
      .filter((permission) => permission.resource === resource)
      .sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action));
    if (own.length === 0) return [];

    return [
      {
        resource,
        manage: own.find((permission) => permission.action === Action.manage),
        actions: own.filter((permission) => permission.action !== Action.manage),
      },
    ];
  });
}

/**
 * Los permisos de un rol en una linea por recurso: `Tickets: Ver, Crear`. Con
 * `manage` el resto sobra, igual que en `Role.grants()`.
 */
export function describePermissions(permissions: Permission[]): string {
  if (permissions.length === 0) return '—';

  return groupPermissions(permissions)
    .map(({ resource, manage, actions }) => {
      const granted = manage ? [manage] : actions;
      return `${RESOURCE_LABELS[resource]}: ${granted
        .map((permission) => ACTION_LABELS[permission.action])
        .join(', ')}`;
    })
    .join('\n');
}

/** El mismo patron que `Slug` en `app/modules/auth/schemas.py`. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 50;

/** `Agente Nivel 2` -> `agente-nivel-2`. Lo que se propone al escribir el nombre. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, '');
}

/** Para comparar la seleccion con la del rol sin depender del orden. */
export function sameIds(a: Iterable<number>, b: Iterable<number>): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((id) => right.has(id));
}
