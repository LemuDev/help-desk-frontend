import { api } from '@/lib/api';
import type {
  Permission,
  Role,
  RoleCreate,
  RoleListQuery,
  RolePage,
  RoleUpdate,
} from '@/types';

/** `GET /roles` — exige `role:read`. Ordenados por nombre. */
export async function fetchRoles({ search, ...params }: RoleListQuery = {}): Promise<RolePage> {
  const { data } = await api.get<RolePage>('/roles', {
    // El router lo llama `name` y busca en nombre y slug. Vacio se omite.
    params: { ...params, name: search || undefined },
  });
  return data;
}

/** `GET /roles/{id}` — mismo permiso que la lista. */
export async function fetchRole(id: string): Promise<Role> {
  const { data } = await api.get<Role>(`/roles/${id}`);
  return data;
}

/** `POST /roles` — exige `role:create`. 409 si el slug ya existe en esa empresa. */
export async function createRole(payload: RoleCreate): Promise<Role> {
  const { data } = await api.post<Role>('/roles', payload);
  return data;
}

/** `PATCH /roles/{id}` — exige `role:update`. `permission_ids` reemplaza la lista entera. */
export async function updateRole(id: number, payload: RoleUpdate): Promise<Role> {
  const { data } = await api.patch<Role>(`/roles/${id}`, payload);
  return data;
}

/** `DELETE /roles/{id}` — exige `role:delete`. 409 si es de sistema o tiene usuarios. */
export async function deleteRole(id: number): Promise<void> {
  await api.delete(`/roles/${id}`);
}

/**
 * `GET /permissions` — el catalogo entero, sin paginar (recursos x acciones).
 * Lo guarda `role:read`: quien ve roles necesita el catalogo para entenderlos.
 */
export async function fetchPermissions(): Promise<Permission[]> {
  const { data } = await api.get<Permission[]>('/permissions');
  return data;
}
