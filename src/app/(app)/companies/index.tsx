import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateModal } from "@/components/create-modal";
import { EditButton } from "@/components/edit-button";
import { EditModal } from "@/components/edit-modal";
import type { FormField } from "@/components/form-modal";
import { ItemList, type ItemDetailLink } from "@/components/item-list";
import { can } from "@/lib/permissions";
import {
  createCompany,
  fetchCompanies,
  updateCompany,
} from "@/services/companies";
import { useAuthStore } from "@/store/auth-store";
import type { Company, CompanyCreate } from "@/types";
import { Action, Resource } from "@/types";

/**
 * Pantalla protegida: solo existe si el backend concedio `company:read`, segun
 * `SCREEN_PERMISSIONS`. Lista y busqueda las lleva `ItemList`; alta y edicion,
 * `CreateModal` y `EditModal`. El detalle es su propia pantalla, `[id].tsx`.
 */
export default function CompaniesScreen() {
  const user = useAuthStore((state) => state.user);
  const canCreate = can(user, Resource.company, Action.create);
  const canEdit = can(user, Resource.company, Action.update);

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
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
            accessibilityLabel="Nueva empresa"
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
          <CreateModal
            isVisible={isCreating}
            title="Nueva empresa"
            fields={COMPANY_FIELDS}
            initialValues={{ name: "" }}
            submit={createCompany}
            onClose={() => setIsCreating(false)}
            onCreated={() => {
              setIsCreating(false);
              reload();
            }}
          />
        </>
      ) : null}

      {/* Solo montado con una empresa elegida: `EditModal` lee sus valores al
          montarse, y la `key` lo remonta si se edita otra. */}
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
            reload();
          }}
        />
      ) : null}

      <ItemList
        key={listVersion}
        fetchPage={fetchCompanies}
        keyExtractor={(company) => String(company.id)}
        renderItem={(company) => (
          <CompanyRow company={company} hasAction={canEdit} />
        )}
        renderAction={
          canEdit
            ? (company) => (
                <EditButton
                  label={`Editar ${company.name}`}
                  onPress={() => setEditing(company)}
                />
              )
            : undefined
        }
        searchPlaceholder="Buscar por nombre"
        emptyLabel="No hay empresas."
        detail={COMPANY_DETAIL}
        size={2}
      />
    </SafeAreaView>
  );
}

/** Los mismos limites que `Name` en `app/modules/company/schemas.py`. */
const COMPANY_FIELDS: FormField<CompanyCreate>[] = [
  {
    type: "text",
    name: "name",
    label: "Nombre",
    hint: "Unico. Maximo 100 caracteres.",
    minLength: 1,
  },
];

const COMPANY_DETAIL: ItemDetailLink<Company> = {
  href: (company) => ({
    pathname: "/companies/[id]",
    params: { id: String(company.id) },
  }),
  label: (company) => company.name,
};

/** Con `hasAction` deja hueco a la derecha para el lapiz de `renderAction`. */
function CompanyRow({
  company,
  hasAction,
}: {
  company: Company;
  hasAction: boolean;
}) {
  return (
    <View
      className={`rounded-xl bg-element px-4 py-10 dark:bg-element-dark ${hasAction ? "pr-14" : ""}`}
    >
      <Text
        className="text-base font-semibold text-content dark:text-content-dark"
        numberOfLines={1}
      >
        {company.name}
      </Text>
    </View>
  );
}
