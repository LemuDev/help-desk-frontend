import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useState } from "react";
import { Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateModal } from "@/components/create-modal";
import { EditButton } from "@/components/edit-button";
import { EditModal } from "@/components/edit-modal";
import { ItemList, type ItemDetailLink } from "@/components/item-list";
import { ProductRow } from "@/components/product-row";
import { SelectField } from "@/components/select-field";
import { toApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import {
  EMPTY_PRODUCT,
  PRODUCT_FIELDS,
  productToFormValues,
  toProductCreate,
  toProductUpdate,
} from "@/lib/product-form";
import {
  createProduct,
  fetchCategories,
  fetchProducts,
  updateProduct,
} from "@/services/catalog";
import { useAuthStore } from "@/store/auth-store";
import type { Category, PaginatedQuery, Product } from "@/types";
import { Action, Resource } from "@/types";

/** El tope de `size` de la API (`PageParams`): con mas, las ultimas no salen. */
const PICKER_SIZE = 50;

/**
 * Pantalla protegida: solo existe si el backend concedio `product:read`, segun
 * `SCREEN_PERMISSIONS`. Lista y busqueda (nombre y numero de serie) las lleva
 * `ItemList`; alta y edicion, `CreateModal` y `EditModal`. El detalle es su
 * propia pantalla, `[id].tsx`.
 */
export default function ProductsScreen() {
  const user = useAuthStore((state) => state.user);
  const canCreate = can(user, Resource.product, Action.create);
  const canEdit = can(user, Resource.product, Action.update);
  // Las categorias piden su propio permiso: sin el no hay filtro.
  const canFilter = can(user, Resource.category, Action.read);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const fetchPage = useCallback(
    (query: PaginatedQuery) =>
      fetchProducts({ ...query, category_id: categoryId ?? undefined }),
    [categoryId],
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
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
            accessibilityLabel="Nuevo producto"
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
          <CreateModal
            isVisible={isCreating}
            title="Nuevo producto"
            fields={PRODUCT_FIELDS}
            initialValues={EMPTY_PRODUCT}
            submit={(values) => createProduct(toProductCreate(values))}
            onClose={() => setIsCreating(false)}
            onCreated={() => {
              setIsCreating(false);
              reload();
            }}
          />
        </>
      ) : null}

      {/* Solo montado con un producto elegido: `EditModal` lee sus valores al
          montarse, y la `key` lo remonta si se edita otro. */}
      {editing ? (
        <EditModal
          key={editing.id}
          isVisible
          title="Editar producto"
          fields={PRODUCT_FIELDS}
          initialValues={productToFormValues(editing)}
          submit={(changes) =>
            updateProduct(editing.id, toProductUpdate(changes))
          }
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : null}

      <ItemList
        key={listVersion}
        fetchPage={fetchPage}
        keyExtractor={(product) => product.id}
        renderItem={(product) => (
          <ProductRow product={product} hasAction={canEdit} />
        )}
        renderAction={
          canEdit
            ? (product) => (
                <EditButton
                  label={`Editar ${product.name}`}
                  onPress={() => setEditing(product)}
                />
              )
            : undefined
        }
        searchPlaceholder="Buscar por nombre o numero de serie"
        filters={
          canFilter ? (
            <CategoryFilter value={categoryId} onChange={setCategoryId} />
          ) : null
        }
        emptyLabel={
          categoryId === null
            ? "No hay productos."
            : "No hay productos en esta categoria."
        }
        detail={PRODUCT_DETAIL}
      />
    </SafeAreaView>
  );
}

const PRODUCT_DETAIL: ItemDetailLink<Product> = {
  href: (product) => ({ pathname: "/products/[id]", params: { id: product.id } }),
  label: (product) => product.name,
};

/** Como `BranchFilter`, pero con las categorias del catalogo. */
function CategoryFilter({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    fetchCategories({ size: PICKER_SIZE })
      .then((page) => isCurrent && setCategories(page.items))
      .catch((cause) => isCurrent && setError(toApiError(cause).message))
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <SelectField
      title="Categoria"
      placeholder="Todas las categorias"
      emptyLabel={error ?? "No hay categorias."}
      options={categories.map(({ id, name }) => ({ value: id, label: name }))}
      value={value}
      onChange={onChange}
      clearable
      isLoading={isLoading}
    />
  );
}
