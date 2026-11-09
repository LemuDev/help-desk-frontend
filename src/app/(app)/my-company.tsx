import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text } from "react-native";

import { DetailView, type DetailConfig } from "@/components/detail-view";
import { EditModal } from "@/components/edit-modal";
import type { FormField } from "@/components/form-modal";
import { useTheme } from "@/hooks/use-theme";
import { can } from "@/lib/permissions";
import { fetchCompany, updateCompany } from "@/services/companies";
import { useAuthStore } from "@/store/auth-store";
import type { Company, CompanyUpdate } from "@/types";
import { Action, Resource } from "@/types";

/**
 * La empresa del cliente que entra: la pestana "Empresa" del tab bar.
 *
 * No esta en `SCREEN_PERMISSIONS` porque no pide permiso: la API deja a un
 * cliente leer su propia empresa sin `company:read`
 * (`CompanyController.get_company`). El guard de `src/app/(app)/_layout.tsx`
 * la monta solo para clientes con empresa; lo que se puede hacer en ella
 * (editarla, entrar a las sucursales) lo deciden sus permisos aqui.
 */
export default function MyCompanyScreen() {
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();
  const canEdit = can(user, Resource.company, Action.update);
  const canSeeBranches = can(user, Resource.branch, Action.read);

  const [editing, setEditing] = useState<Company | null>(null);
  // `DetailView` no expone su recarga: cambiar la `key` la remonta.
  const [version, setVersion] = useState(0);

  // El guard del layout ya exige empresa; esto solo contenta al tipo.
  if (user?.company_id == null) return null;

  return (
    <>
      {editing ? (
        <EditModal
          key={editing.id}
          isVisible
          title="Editar empresa"
          fields={COMPANY_FIELDS}
          initialValues={{ name: editing.name }}
          submit={(changes) => updateCompany(editing.id, changes)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setVersion((current) => current + 1);
          }}
        />
      ) : null}

      <DetailView key={version} id={String(user.company_id)} detail={COMPANY_DETAIL}>
        {canEdit || canSeeBranches
          ? (company) => (
              <>
                {canEdit ? (
                  <ActionRow
                    icon="create-outline"
                    label="Editar nombre"
                    color={theme.textSecondary}
                    onPress={() => setEditing(company)}
                  />
                ) : null}
                {canSeeBranches ? (
                  <ActionRow
                    icon="storefront-outline"
                    label="Sucursales"
                    color={theme.textSecondary}
                    onPress={() =>
                      router.push({
                        pathname: "/companies/[id]/branches",
                        params: { id: String(company.id) },
                      })
                    }
                  />
                ) : null}
              </>
            )
          : undefined}
      </DetailView>
    </>
  );
}

/** El mismo boton-fila que el enlace a sucursales de `companies/[id]/index.tsx`. */
function ActionRow({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-3 rounded-xl bg-element px-4 py-4 active:opacity-70 dark:bg-element-dark"
      onPress={onPress}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text className="flex-1 text-base font-semibold text-content dark:text-content-dark">
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={color} />
    </Pressable>
  );
}

/** Los mismos limites que `Name` en `app/modules/company/schemas.py`. */
const COMPANY_FIELDS: FormField<Required<CompanyUpdate>>[] = [
  {
    type: "text",
    name: "name",
    label: "Nombre",
    hint: "Unico. Maximo 100 caracteres.",
    minLength: 1,
  },
];

const COMPANY_DETAIL: DetailConfig<Company> = {
  title: (company) => company.name,
  fetch: fetchCompany,
  hide: ["id", "name", "deleted_at"],
  labels: {
    created_at: "Creada",
    updated_at: "Actualizada",
  },
};
