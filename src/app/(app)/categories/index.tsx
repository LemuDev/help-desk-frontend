import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateModal } from "@/components/create-modal";
import { EditButton } from "@/components/edit-button";
import { EditModal } from "@/components/edit-modal";
import { ItemList, type ItemDetailLink } from "@/components/item-list";
import { CATEGORY_FIELDS, productCountLabel } from "@/lib/category-form";
import { can } from "@/lib/permissions";
import {
  createCategory,
  fetchCategories,
  updateCategory,
} from "@/services/catalog";
import { useAuthStore } from "@/store/auth-store";
import type { CategoryWithCount } from "@/types";
import { Action, Resource } from "@/types";

/**
 * Pantalla protegida: solo existe si el backend concedio `category:read`,
 * segun `SCREEN_PERMISSIONS`. Lista y busqueda las lleva `ItemList`; alta y
 * edicion, `CreateModal` y `EditModal`. El detalle es su propia pantalla,
 * `[id].tsx`, con los productos de la categoria.
 */
export default function CategoriesScreen() {
  const user = useAuthStore((state) => state.user);
  const canCreate = can(user, Resource.category, Action.create);
  const canEdit = can(user, Resource.category, Action.update);

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<CategoryWithCount | null>(null);
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
            accessibilityLabel="Nueva categoria"
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
          <CreateModal
            isVisible={isCreating}
            title="Nueva categoria"
            fields={CATEGORY_FIELDS}
            initialValues={{ name: "" }}
            submit={createCategory}
            onClose={() => setIsCreating(false)}
            onCreated={() => {
              setIsCreating(false);
              reload();
            }}
          />
        </>
      ) : null}

      {/* Solo montado con una categoria elegida: `EditModal` lee sus valores
          al montarse, y la `key` lo remonta si se edita otra. */}
      {editing ? (
        <EditModal
          key={editing.id}
          isVisible
          title="Editar categoria"
          fields={CATEGORY_FIELDS}
          initialValues={{ name: editing.name }}
          submit={(changes) => updateCategory(editing.id, changes)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : null}

      <ItemList
        key={listVersion}
        fetchPage={fetchCategories}
        keyExtractor={(category) => category.id}
        renderItem={(category) => (
          <CategoryRow category={category} hasAction={canEdit} />
        )}
        renderAction={
          canEdit
            ? (category) => (
                <EditButton
                  label={`Editar ${category.name}`}
                  onPress={() => setEditing(category)}
                />
              )
            : undefined
        }
        searchPlaceholder="Buscar por nombre"
        emptyLabel="No hay categorias."
        detail={CATEGORY_DETAIL}
      />
    </SafeAreaView>
  );
}

const CATEGORY_DETAIL: ItemDetailLink<CategoryWithCount> = {
  href: (category) => ({
    pathname: "/categories/[id]",
    params: { id: category.id },
  }),
  label: (category) =>
    `${category.name}, ${productCountLabel(category.product_count)}`,
};

/** Con `hasAction` deja hueco a la derecha para el lapiz de `renderAction`. */
function CategoryRow({
  category,
  hasAction,
}: {
  category: CategoryWithCount;
  hasAction: boolean;
}) {
  const isEmpty = category.product_count === 0;

  return (
    <View
      className={`flex-row items-center gap-3 rounded-xl bg-element px-4 py-4 dark:bg-element-dark ${hasAction ? "pr-14" : ""}`}
    >
      <Text
        className="flex-1 text-base font-semibold text-content dark:text-content-dark"
        numberOfLines={1}
      >
        {category.name}
      </Text>
      <View
        className={`rounded-full px-3 py-1 ${
          isEmpty ? "bg-selected dark:bg-selected-dark" : "bg-brand/15 dark:bg-brand-dark/25"
        }`}
      >
        <Text
          className={`text-xs font-semibold ${
            isEmpty ? "text-muted dark:text-muted-dark" : "text-brand dark:text-brand-dark"
          }`}
        >
          {productCountLabel(category.product_count)}
        </Text>
      </View>
    </View>
  );
}
