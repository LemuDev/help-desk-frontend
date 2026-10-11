/**
 * Espeja `app/modules/users/schemas.py`.
 */

import type { Page } from './api';

/** `UserRead` — la forma publica del usuario, sin `hashed_password`. */
export type User = {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  /** ISO 8601, o `null` si nunca entro. */
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

/** `UserPage`. */
export type UserPage = Page<User>;