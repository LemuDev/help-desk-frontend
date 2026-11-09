import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useState } from "react";
import { Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateUserModal } from "@/components/create-user-modal";
import { EditButton } from "@/components/edit-button";
import { EditModal } from "@/components/edit-modal";
import { ItemList, type ItemDetailLink } from "@/components/item-list";
import { UserRow } from "@/components/user-row";
import { can } from "@/lib/permissions";
import { toFormValues, toUpdatePayload, userFormFields } from "@/lib/user-form";
import { fetchUsers, updateUser } from "@/services/users";
import { useAuthStore } from "@/store/auth-store";
import { useScopedCompanyId } from "@/store/company-scope-store";
import type { PaginatedQuery, User } from "@/types";
import { Action, Resource } from "@/types";

/**
 * Clientes: los usuarios que no son personal (`is_customer=true`). Son
 * usuarios de la API como los demas, asi que piden los mismos permisos que la
 * seccion Usuarios (`user:read`, `user:create`, `user:update`); lo que cambia
 * es el formulario, sin flags de personal y con la empresa obligatoria.
 */
export default function CustomersScreen() {
  const user = useAuthStore((state) => state.user);
  const canCreate = can(user, Resource.user, Action.create);
  const canEdit = can(user, Resource.user, Action.update);

  // La empresa global del `Sidebar`. A un cliente (el admin de una empresa) la
  // API ya le devuelve solo la suya, y el no la elige.
  const companyId = useScopedCompanyId();
  const fetchPage = useCallback(
    (query: PaginatedQuery) =>
      fetchUsers({ ...query, customer: true, company_id: companyId }),
    [companyId],
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
            accessibilityLabel="Nuevo cliente"
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
          <CreateUserModal
            isVisible={isCreating}
            kind="customer"
            onClose={() => setIsCreating(false)}
            onCreated={() => {
              setIsCreating(false);
              setListVersion((version) => version + 1);
            }}
          />
        </>
      ) : null}

      {/* Solo montado con un cliente elegido: `EditModal` lee sus valores al
          montarse, y la `key` lo remonta si se edita otro. */}
      {editing ? (
        <EditModal
          key={editing.id}
          isVisible
          title="Editar cliente"
          fields={userFormFields(user, "edit", "customer")}
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
        keyExtractor={(customer) => customer.id}
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
        emptyLabel={
          companyId === undefined ? "No hay clientes." : "Esta empresa no tiene clientes."
        }
        detail={CUSTOMER_DETAIL}
      />
    </SafeAreaView>
  );
}

const CUSTOMER_DETAIL: ItemDetailLink<User> = {
  href: (customer) => ({
    pathname: "/customers/[id]",
    params: { id: customer.id },
  }),
  label: (customer) => customer.full_name,
};
