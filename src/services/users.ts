import { api } from '@/lib/api';
import type { User, UserCreate, UserListQuery, UserPage, UserUpdate } from '@/types';

/**
 * `GET /users` — pagina de usuarios. Exige `user:read` (o `user:manage`): sin
 * el, la API responde 403.
 */
export async function fetchUsers({ search, ...params }: UserListQuery = {}): Promise<UserPage> {
  const { data } = await api.get<UserPage>('/users', {
    // El router lo llama `name` y busca en `full_name` y `username`. Vacio se
    // omite: `name=` filtraria por cadena vacia.
    params: { ...params, name: search || undefined },
  });
  return data;
}

/** `GET /users/{id}` — un usuario. Mismo permiso que la lista. */
export async function fetchUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}

/**
 * `POST /users` — exige `user:create`. La API no limita que tipo de usuario se
 * crea (tambien acepta `is_superuser`): esa restriccion es solo del cliente.
 */
export async function createUser(payload: UserCreate): Promise<User> {
  const { data } = await api.post<User>('/users', payload);
  return data;
}

/** `PATCH /users/{id}` — exige `user:update`. Solo cambia lo que viene. */
export async function updateUser(id: string, payload: UserUpdate): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, payload);
  return data;
}
