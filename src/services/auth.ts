import { api } from '@/lib/api';
import type { LoginPayload, LoginResponse, User } from '@/types';

/** `POST /auth/login` — 201 con `access_token`, 401 si las credenciales no cuadran. */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

/** `GET /auth/me` — el usuario que firma el token. 401 si expiro, 403 si esta inactivo. */
export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}