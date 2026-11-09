/**
 * Espeja `app/modules/auth/schemas.py`.
 */

import type { GenericResponse, Page, PaginatedQuery } from './api';
import type { User } from './user';

/** `LoginSchema` — body de `POST /auth/login`. */
export type LoginPayload = {
  username: string;
  password: string;
};

/**
 * `LoginResponse`. El controller devuelve `JSONResponse` a mano, asi que el 401
 * llega sin la clave `access_token`: por eso es opcional y nullable.
 */
export type LoginResponse = GenericResponse & {
  access_token?: string | null;
};

export type AuthStatus =
  /** Todavia no se ha leido el token del almacenamiento. */
  | 'hydrating'
  | 'authenticated'
  | 'unauthenticated';

/**
 * `Resource` y `Action` de `app/modules/auth/models.py`: su producto cartesiano
 * es lo que el seed guarda como filas de `Permission`.
 */
export const Resource = {
  ticket: 'ticket',
  comment: 'comment',
  attachment: 'attachment',
  category: 'category',
  product: 'product',
  user: 'user',
  role: 'role',
  report: 'report',
  settings: 'settings',
  company: 'company',
  branch: 'branch',
} as const;

export type Resource = (typeof Resource)[keyof typeof Resource];

export const Action = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  assign: 'assign',
  close: 'close',
  export: 'export',
  /** Comodin: concede cualquier accion sobre el recurso (`Role.grants()`). */
  manage: 'manage',
} as const;

export type Action = (typeof Action)[keyof typeof Action];

/** `Permission.code` — la forma en que `/auth/me` devuelve cada permiso. */
export type PermissionCode = `${Resource}:${Action}`;

/** Un permiso exigido, antes de armar su codigo. */
export type PermissionRequirement = {
  resource: Resource;
  action: Action;
};

/**
 * `UserMe` — la respuesta de `GET /auth/me`: el usuario del token con los
 * permisos que le conceden sus roles. Ojo: un superusuario puede traer
 * `permissions` vacio y poder todo, asi que la decision se toma con `can()`
 * (`@/lib/permissions`) y no leyendo la lista a mano.
 */
export type CurrentUser = User & {
  permissions: PermissionCode[];
};

// --- roles y permisos --------------------------------------------------------

/** `PermissionRead` — una fila del catalogo de `GET /permissions`. */
export type Permission = {
  id: number;
  resource: Resource;
  action: Action;
  /** La misma forma que en `/auth/me`. */
  code: PermissionCode;
  description: string | null;
};

/** `RoleRead`. `permissions` llega ordenado por `code`. */
export type Role = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  /** Los del seed (admin, agent, customer): no se renombran ni se borran. */
  is_system: boolean;
  /** Nulo = rol global. */
  company_id: number | null;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
};

/** `RoleCreate` — body de `POST /roles`. */
export type RoleCreate = {
  /** 1-50 caracteres: minusculas, digitos y `-`/`_` sueltos. Unico por empresa. */
  slug: string;
  /** 1-100 caracteres, recortado. */
  name: string;
  /** Maximo 255 caracteres. */
  description?: string | null;
  /** No se puede cambiar despues: no esta en `RoleUpdate`. */
  company_id?: number | null;
  permission_ids?: number[];
};

/**
 * `RoleUpdate` — body de `PATCH /roles/{id}`. `description` en `null` la
 * borra; en el resto un `null` no hace nada. En un rol de sistema solo se
 * aceptan `description` y `permission_ids` (si no, 409).
 */
export type RoleUpdate = Partial<Omit<RoleCreate, 'company_id'>>;

/** Query params de `GET /roles`. */
export type RoleListQuery = PaginatedQuery & {
  company_id?: number;
  /** Solo los globales; gana a `company_id`. */
  only_global?: boolean;
};

export type RolePage = Page<Role>;
