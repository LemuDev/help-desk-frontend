import { api } from '@/lib/api';
import type { CurrentUser, LoginPayload, LoginResponse } from '@/types';

/** `POST /auth/login` — 201 con `access_token`, 401 si las credenciales no cuadran. */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

/**
 * `GET /auth/me` — el usuario que firma el token, con sus permisos. 401 si
 * expiro, 403 si esta inactivo.
 *
 * Los permisos se leen de la base de datos en cada peticion, asi que lo que se
 * edite en `/admin` entra en la siguiente llamada a esta ruta (el arranque de
 * la app o el login), no al vuelo.
 */
export async function fetchMe(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/auth/me');
  return data;
}