import { useLocalSearchParams } from "expo-router";

import { DetailView, type DetailConfig } from "@/components/detail-view";
import { describePermissions } from "@/lib/role-form";
import { fetchRole } from "@/services/roles";
import type { Permission, Role } from "@/types";

/**
 * Detalle de un rol (`/roles/{id}`). Protegida por `role:read` en
 * `SCREEN_PERMISSIONS`, el mismo permiso que la lista y que `GET /roles/{id}`.
 */
export default function RoleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <DetailView id={id} detail={ROLE_DETAIL} />;
}

const ROLE_DETAIL: DetailConfig<Role> = {
  title: (role) => role.name,
  subtitle: (role) => role.slug,
  fetch: fetchRole,
  hide: ["name", "slug"],
  labels: {
    id: "ID",
    description: "Descripcion",
    is_system: "De sistema",
    company_id: "Empresa",
    permissions: "Permisos",
    created_at: "Creado",
    updated_at: "Actualizado",
  },
  format: {
    company_id: (value) => (value === null ? "Global" : String(value)),
    // Sin esto cada permiso saldria como JSON.
    permissions: (value) => describePermissions(value as Permission[]),
  },
};
