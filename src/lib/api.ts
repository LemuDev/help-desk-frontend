import { AxiosHeaders, create, isAxiosError, type AxiosError } from 'axios';
import Constants from 'expo-constants';

import type { ApiError } from '@/types';

/**
 * Cliente HTTP contra la API de FastAPI.
 *
 * El backend monta `app/api/api.py` en la raiz (`app.include_router(api)`), asi
 * que las rutas son `/auth/login`, `/users`, ... sin prefijo `/api`.
 */

/** Host de Metro (`192.168.x.x:8081`) para que un movil fisico no pegue a su propio localhost. */
function guessDevHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:8000` : null;
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? guessDevHost() ?? 'http://localhost:8000';

export const api = create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

/** Rutas que devuelven 401 como respuesta legitima: un 401 ahi no cierra sesion. */
const PUBLIC_PATHS = ['/auth/login'];

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Deja el token que el interceptor pondra en `Authorization`. `null` lo quita. */
export function setAuthToken(token: string | null) {
  accessToken = token;
}

/** Que hacer cuando la API rechaza el token (expirado, usuario borrado, inactivo). */
export function registerUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    // `app/modules/auth/deps.py` usa HTTPBearer, no OAuth2PasswordBearer.
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    config.headers = headers;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const path = error.config?.url ?? '';
    const isPublic = PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath));

    if (error.response?.status === 401 && !isPublic) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** El `detail` de FastAPI: string en los errores propios, lista en los 422 de pydantic. */
function readDetail(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('detail' in data)) return null;

  const detail = (data as { detail: unknown }).detail;
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === 'object' && item !== null ? (item as { msg?: string }).msg : null))
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join('. ');
  }
  return null;
}

/** Normaliza cualquier fallo en algo que una pantalla pueda mostrar. */
export function toApiError(error: unknown): ApiError {
  if (!isAxiosError(error)) {
    return {
      message: error instanceof Error ? error.message : 'Ocurrio un error inesperado',
      isNetworkError: false,
    };
  }

  if (!error.response) {
    return {
      message:
        error.code === 'ECONNABORTED'
          ? 'La peticion tardo demasiado. Intenta de nuevo.'
          : `No se pudo conectar con el servidor (${API_URL}).`,
      isNetworkError: true,
    };
  }

  const { status, data } = error.response;
  return {
    message: readDetail(data) ?? `Error ${status} del servidor`,
    status,
    isNetworkError: false,
  };
}