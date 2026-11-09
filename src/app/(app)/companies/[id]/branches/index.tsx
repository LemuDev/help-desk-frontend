import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateModal } from "@/components/create-modal";
import { EditButton } from "@/components/edit-button";
import { EditModal } from "@/components/edit-modal";
import type { FormField } from "@/components/form-modal";
import { ItemList, type ItemDetailLink } from "@/components/item-list";
import { useTheme } from "@/hooks/use-theme";
import { can } from "@/lib/permissions";
import {
  createBranch,
  fetchBranches,
  fetchCompany,
  updateBranch,
} from "@/services/companies";
import { useAuthStore } from "@/store/auth-store";
import type { Branch, BranchCreate, Company, PaginatedQuery } from "@/types";
import { Action, Resource } from "@/types";

/**
 * Sucursales de una empresa (`/companies/{id}/branches`). Protegida por
 * `branch:read` en `SCREEN_PERMISSIONS`. Igual que la lista de empresas: alta
 * y edicion en modal, detalle (y borrado) en `[branchId].tsx`.
 *
 * Arriba va el nombre de la empresa: la URL solo trae su id, y sin el no se
 * sabe de cual son las sucursales ni en cual se crea la nueva.
 */
export default function BranchesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = Number(id);
  const user = useAuthStore((state) => state.user);
  const canCreate = can(user, Resource.branch, Action.create);
  const canEdit = can(user, Resource.branch, Action.update);
  const theme = useTheme();

  // `GET /companies/{id}` pide `company:read`, que tiene quien llega aqui
  // desde el detalle de empresa. Si falla, la lista sigue funcionando sin nombre.
  const [company, setCompany] = useState<Company | null>(null);
  useEffect(() => {
    let isCurrent = true;
    fetchCompany(String(companyId))
      .then((data) => isCurrent && setCompany(data))
      .catch(() => isCurrent && setCompany(null));
    return () => {
      isCurrent = false;
    };
  }, [companyId]);

  // `usePaginated` pide un `fetchPage` estable: cambia solo con la empresa.
  const fetchPage = useCallback(
    (query: PaginatedQuery) => fetchBranches(companyId, query),
    [companyId],
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  // `ItemList` no expone su recarga: cambiar la `key` la remonta y vuelve a
  // pedir la pagina 1.
  const [listVersion, setListVersion] = useState(0);
  const reload = () => setListVersion((version) => version + 1);

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
            accessibilityLabel="Nueva sucursal"
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
          <CreateModal
            isVisible={isCreating}
            title={company ? `Nueva sucursal en ${company.name}` : "Nueva sucursal"}
            fields={BRANCH_FIELDS}
            initialValues={{ name: "" }}
            submit={(values) => createBranch(companyId, values)}
            onClose={() => setIsCreating(false)}
            onCreated={() => {
              setIsCreating(false);
              reload();
            }}
          />
        </>
      ) : null}

      {/* Solo montado con una sucursal elegida: `EditModal` lee sus valores al
          montarse, y la `key` lo remonta si se edita otra. */}
      {editing ? (
        <EditModal
          key={editing.id}
          isVisible
          title="Editar sucursal"
          fields={BRANCH_FIELDS}
          initialValues={{ name: editing.name }}
          submit={(changes) => updateBranch(companyId, editing.id, changes)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : null}

      <View className="flex-row items-center gap-2 px-6 pt-4">
        <Ionicons
          name="business-outline"
          size={18}
          color={theme.textSecondary}
        />
        <Text
          className="flex-1 text-lg font-bold text-content dark:text-content-dark"
          numberOfLines={1}
        >
          {company?.name ?? " "}
        </Text>
      </View>

      <ItemList
        key={listVersion}
        fetchPage={fetchPage}
        keyExtractor={(branch) => String(branch.id)}
        renderItem={(branch) => (
          <BranchRow branch={branch} hasAction={canEdit} />
        )}
        renderAction={
          canEdit
            ? (branch) => (
                <EditButton
                  label={`Editar ${branch.name}`}
                  onPress={() => setEditing(branch)}
                />
              )
            : undefined
        }
        searchPlaceholder="Buscar por nombre"
        emptyLabel="Esta empresa no tiene sucursales."
        detail={BRANCH_DETAIL}
      />
    </SafeAreaView>
  );
}

/**
 * Los mismos limites que `Name` en `app/modules/company/schemas.py`. El unico
 * es por empresa: dos empresas pueden tener una sucursal con el mismo nombre.
 */
const BRANCH_FIELDS: FormField<BranchCreate>[] = [
  {
    type: "text",
    name: "name",
    label: "Nombre",
    hint: "Unico en la empresa. Maximo 100 caracteres.",
    minLength: 1,
  },
];

const BRANCH_DETAIL: ItemDetailLink<Branch> = {
  href: (branch) => ({
    pathname: "/companies/[id]/branches/[branchId]",
    params: { id: String(branch.company_id), branchId: String(branch.id) },
  }),
  label: (branch) => branch.name,
};

/** Con `hasAction` deja hueco a la derecha para el lapiz de `renderAction`. */
function BranchRow({
  branch,
  hasAction,
}: {
  branch: Branch;
  hasAction: boolean;
}) {
  return (
    <View
      className={`rounded-xl bg-element px-4 py-4 dark:bg-element-dark ${hasAction ? "pr-14" : ""}`}
    >
      <Text
        className="text-base font-semibold text-content dark:text-content-dark"
        numberOfLines={1}
      >
        {branch.name}
      </Text>
    </View>
  );
}