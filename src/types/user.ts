/**
 * Espeja `app/modules/users/schemas.py`.
 */

import type { Page, PaginatedQuery } from './api';

/** `UserRoleRead` — el rol tal como viene dentro de un usuario. */
export type UserRole = {
  id: number;
  slug: string;
  name: string;
};

/** `UserRead` — la forma publica del usuario, sin `hashed_password`. */
export type User = {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  /** Personal de la empresa. `false` = cliente: abre tickets, no los atiende. */
  is_worker: boolean;
  is_superuser: boolean;
  company_id: number | null;
  branch_id: number | null;
  roles: UserRole[];
  /** ISO 8601, o `null` si nunca entro. */
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

/** `UserCreate` — body de `POST /users`. */
export type UserCreate = {
  /** 3-255 caracteres; la API recorta espacios. */
  username: string;
  /** 8-128 caracteres, sin recortar. */
  password: string;
  full_name: string;
  is_active?: boolean;
  is_worker?: boolean;
  is_superuser?: boolean;
  company_id?: number | null;
  /** Tiene que ser de `company_id`: si no, la API responde 400. */
  branch_id?: number | null;
  role_ids?: number[];
};

/**
 * `UserUpdate` — body de `PATCH /users/{id}`. Solo se escribe lo que venga;
 * `company_id`/`branch_id` en `null` desasignan.
 */
export type UserUpdate = Partial<UserCreate>;

/** `UserPage`. */
export type UserPage = Page<User>;
/** Query params de `GET /users`. */
export type UserListQuery = PaginatedQuery & {
  is_active?: boolean;
  /** Solo los usuarios que tienen ese rol. */
  role_id?: number;
  /**
   * `true`: solo clientes (ni `is_worker` ni `is_superuser`, como
   * `isCustomer()`); `false`: solo personal. Sin el, todos.
   */
  customer?: boolean;
  /** Solo los de esa empresa. A un cliente la API le fija siempre la suya. */
  company_id?: number;
};
