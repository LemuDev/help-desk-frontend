import { useLocalSearchParams } from "expo-router";

import { DetailView, type DetailConfig } from "@/components/detail-view";
import { fetchUser } from "@/services/users";
import type { User } from "@/types";

/**
 * Detalle de un usuario (`/users/{id}`). Protegida por `user:read` en
 * `SCREEN_PERMISSIONS`, el mismo permiso que la lista y que `GET /users/{id}`.
 */
export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <DetailView id={id} detail={USER_DETAIL} />;
}

/**
 * Se pinta lo que devuelva `GET /users/{id}`. Las etiquetas son solo para que
 * salga en castellano: sin ellas los campos se etiquetarian con su nombre del
 * backend.
 */
const USER_DETAIL: DetailConfig<User> = {
  title: (user) => user.full_name,
  subtitle: (user) => `@${user.username}`,
  fetch: fetchUser,
  hide: ["full_name", "username"],
  labels: {
    id: "ID",
    is_active: "Activo",
    is_superuser: "Superusuario",
    last_login_at: "Ultimo acceso",
    created_at: "Creado",
    updated_at: "Actualizado",
  },
};
