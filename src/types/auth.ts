/**
 * Espeja `app/modules/auth/schemas.py`.
 */

import type { GenericResponse } from './api';

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