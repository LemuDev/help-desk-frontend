import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EditButton } from "@/components/edit-button";
import { ItemList, type ItemDetailLink } from "@/components/item-list";
import { RoleFormModal } from "@/components/role-form-modal";
import { can } from "@/lib/permissions";
import { fetchRoles } from "@/services/roles";
import { useAuthStore } from "@/store/auth-store";
import { useScopedCompanyId } from "@/store/company-scope-store";
import type { PaginatedQuery, Role } from "@/types";
import { Action, Resource } from "@/types";

/**
 * Pantalla protegida: solo existe si el backend concedio `role:read`, segun
 * `SCREEN_PERMISSIONS`. Lista y busqueda las lleva `ItemList`; alta, edicion y
 * borrado, `RoleFormModal` (no `CreateModal`/`EditModal`: la rejilla de
 * permisos no es un campo de `FormModal`). El detalle es `[id].tsx`.
 */
export default function RolesScreen() {
  const user = useAuthStore((state) => state.user);
  const canCreate = can(user, Resource.role, Action.create);
  const canEdit = can(user, Resource.role, Action.update);

  // Con una empresa elegida en el `Sidebar`, solo sus roles: los globales son
  // de todas y se ven quitando el filtro.
  const companyId = useScopedCompanyId();
  const fetchPage = useCallback(
    (query: PaginatedQuery) => fetchRoles({ ...query, company_id: companyId }),
    [companyId],
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  // `ItemList` no expone su recarga: cambiar la `key` la remonta y vuelve a
  // pedir la pagina 1.
  const [listVersion, setListVersion] = useState(0);

  function done() {
    setIsCreating(false);
    setEditing(null);
    setListVersion((version) => version + 1);
  }

  return (
    // El inset de arriba lo pone el `TopBar`, asi que aqui solo el de abajo.
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["bottom", "left", "right"]}
    >
      {canCreate ? (
        <Pressable
          className="absolute bottom-8 right-6 z-10 h-14 w-14 items-center justify-center rounded-full bg-brand shadow-lg active:opacity-80 dark:bg-brand-dark"
          onPress={() => setIsCreating(true)}
          accessibilityRole="button"
          accessibilityLabel="Nuevo rol"
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
      ) : null}

      {/* Montados solo cuando hacen falta: `RoleFormModal` lee el rol al
          montarse, y asi cada alta arranca vacia. */}
      {isCreating ? (
        <RoleFormModal onClose={() => setIsCreating(false)} onDone={done} />
      ) : null}
      {editing ? (
        <RoleFormModal
          key={editing.id}
          role={editing}
          onClose={() => setEditing(null)}
          onDone={done}
        />
      ) : null}

      <ItemList
        key={listVersion}
        fetchPage={fetchPage}
        keyExtractor={(role) => String(role.id)}
        renderItem={(role) => <RoleRow role={role} hasAction={canEdit} />}
        renderAction={
          canEdit
            ? (role) => (
                <EditButton
                  label={`Editar ${role.name}`}
                  onPress={() => setEditing(role)}
                />
              )
            : undefined
        }
        searchPlaceholder="Buscar por nombre o slug"
        emptyLabel={
          companyId === undefined ? "No hay roles." : "Esta empresa no tiene roles propios."
        }
        detail={ROLE_DETAIL}
      />
    </SafeAreaView>
  );
}

const ROLE_DETAIL: ItemDetailLink<Role> = {
  href: (role) => ({
    pathname: "/roles/[id]",
    params: { id: String(role.id) },
  }),
  label: (role) => role.name,
};

/** Con `hasAction` deja hueco a la derecha para el lapiz de `renderAction`. */
function RoleRow({ role, hasAction }: { role: Role; hasAction: boolean }) {
  const count = role.permissions.length;

  return (
    <View
      className={`rounded-xl bg-element px-4 py-3 dark:bg-element-dark ${hasAction ? "pr-14" : ""}`}
    >
      <Text
        className="text-base font-semibold text-content dark:text-content-dark"
        numberOfLines={1}
      >
        {role.name}
      </Text>
      <Text className="mt-0.5 text-sm text-muted dark:text-muted-dark">
        {role.slug}
        {role.company_id === null ? " · global" : " · de empresa"}
        {role.is_system ? " · sistema" : ""}
        {` · ${count} ${count === 1 ? "permiso" : "permisos"}`}
      </Text>
    </View>
  );
}
