import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useState } from "react";
import { Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateUserModal } from "@/components/create-user-modal";
import { EditButton } from "@/components/edit-button";
import { EditModal } from "@/components/edit-modal";
import { ItemList, type ItemDetailLink } from "@/components/item-list";
import { SelectField } from "@/components/select-field";
import { UserRow } from "@/components/user-row";
import { toApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import {
  toFormValues,
  toUpdatePayload,
  userFormFields,
} from "@/lib/user-form";
import { fetchRoles } from "@/services/roles";
import { fetchUsers, updateUser } from "@/services/users";
import { useAuthStore } from "@/store/auth-store";
import { Action, Resource } from "@/types";
import type { PaginatedQuery, Role, User } from "@/types";

/**
 * Pantalla protegida: solo existe si el backend concedio `user:read`, segun
 * `SCREEN_PERMISSIONS` en `src/lib/screen-permissions.ts`. Por eso aqui no se
 * vuelve a comprobar el permiso.
 *
 * Solo el personal (`is_customer=false`): los clientes tienen su seccion,
 * `customers/`. Todo lo de lista, busqueda y paginacion lo lleva `ItemList`:
 * aqui solo queda lo propio de usuarios. El detalle es su propia pantalla,
 * `[id].tsx`.
 */
export default function UsersScreen() {
  const user = useAuthStore((state) => state.user);
  const canCreate = can(user, Resource.user, Action.create);
  const canEdit = can(user, Resource.user, Action.update);
  // El filtro por rol necesita la lista de roles, que pide `role:read`.
  const canFilterByRole = can(user, Resource.role, Action.read);

  const [roleId, setRoleId] = useState<number | null>(null);
  const fetchPage = useCallback(
    (query: PaginatedQuery) =>
      fetchUsers({
        ...query,
        customer: false,
        role_id: roleId ?? undefined,
      }),
    [roleId],
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  // `ItemList` no expone su recarga: cambiar la `key` la remonta y vuelve a
  // pedir la pagina 1, donde sale el recien creado (orden por `created_at`).
  const [listVersion, setListVersion] = useState(0);

  return (
    // El inset de arriba lo pone el `TopBar`, asi que aqui solo el de abajo.
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["bottom", "left", "right"]}
    >
      {canCreate ? (
        <>
          <Pressable
            className="absolute bottom-8 right-6 z-10 h-14 w-14 items-center justify-center rounded-full bg-brand shadow-lg active:opacity-80 dark:bg-brand-dark"
            onPress={() => setIsCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="Nuevo usuario"
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
          <CreateUserModal
            isVisible={isCreating}
            kind="staff"
            onClose={() => setIsCreating(false)}
            onCreated={() => {
              setIsCreating(false);
              setListVersion((version) => version + 1);
            }}
          />
        </>
      ) : null}

      {/* Solo montado con un usuario elegido: `EditModal` lee sus valores al
          montarse, y la `key` lo remonta si se edita otro. */}
      {editing ? (
        <EditModal
          key={editing.id}
          isVisible
          title="Editar usuario"
          fields={userFormFields(user, "edit", "staff")}
          initialValues={toFormValues(editing)}
          submit={(changes) => updateUser(editing.id, toUpdatePayload(changes))}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setListVersion((version) => version + 1);
          }}
        />
      ) : null}

      <ItemList
        key={listVersion}
        fetchPage={fetchPage}
        keyExtractor={(user) => user.id}
        renderItem={(item) => <UserRow user={item} hasAction={canEdit} />}
        renderAction={
          canEdit
            ? (item) => (
                <EditButton
                  label={`Editar a ${item.full_name}`}
                  onPress={() => setEditing(item)}
                />
              )
            : undefined
        }
        searchPlaceholder="Buscar por nombre o usuario"
        filters={
          canFilterByRole ? (
            <RoleFilter value={roleId} onChange={setRoleId} />
          ) : null
        }
        emptyLabel={
          roleId === null ? "No hay usuarios." : "Nadie tiene este rol."
        }
        detail={USER_DETAIL}
      />
    </SafeAreaView>
  );
}

const USER_DETAIL: ItemDetailLink<User> = {
  href: (user) => ({ pathname: "/users/[id]", params: { id: user.id } }),
  label: (user) => user.full_name,
};

/** El tope de `size` de la API (`PageParams`): con mas, los ultimos no salen. */
const ROLE_PICKER_SIZE = 50;

/** Select de rol para `GET /users?role_id=`. Sin elegir, todos los usuarios. */
function RoleFilter({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    fetchRoles({ size: ROLE_PICKER_SIZE })
      .then((page) => isCurrent && setRoles(page.items))
      .catch((cause) => isCurrent && setError(toApiError(cause).message))
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <SelectField
      title="Rol"
      placeholder="Todos los roles"
      emptyLabel={error ?? "No hay roles."}
      options={roles.map(({ id, name }) => ({ value: id, label: name }))}
      value={value}
      onChange={onChange}
      clearable
      isLoading={isLoading}
    />
  );
}
