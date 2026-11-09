import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmModal } from "@/components/confirm-modal";
import { EditModal } from "@/components/edit-modal";
import { ItemList, type ItemDetailLink } from "@/components/item-list";
import { ProductRow } from "@/components/product-row";
import { useTheme } from "@/hooks/use-theme";
import { toApiError } from "@/lib/api";
import { CATEGORY_FIELDS, productCountLabel } from "@/lib/category-form";
import { can } from "@/lib/permissions";
import {
  deleteCategory,
  fetchCategory,
  fetchProducts,
  updateCategory,
} from "@/services/catalog";
import { useAuthStore } from "@/store/auth-store";
import type { CategoryWithCount, PaginatedQuery, Product } from "@/types";
import { Action, Resource } from "@/types";

/**
 * Detalle de una categoria (`/categories/{id}`). Protegida por `category:read`
 * en `SCREEN_PERMISSIONS`. Debajo de la cabecera van sus productos, que piden
 * aparte `product:read` (`GET /products?category_id=`).
 *
 * No va en un `ScrollView` como las otras pantallas de detalle: la lista de
 * productos es un `FlatList` con scroll infinito, y anidarlo romperia la
 * virtualizacion. La cabecera queda fija encima.
 */
export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();
  const canEdit = can(user, Resource.category, Action.update);
  const canDelete = can(user, Resource.category, Action.delete);
  const canSeeProducts = can(user, Resource.product, Action.read);

  const [state, setState] = useState<{
    category: CategoryWithCount | null;
    isLoading: boolean;
    error: string | null;
  }>({ category: null, isLoading: true, error: null });
  // Subirlo relanza la carga: es el "Reintentar".
  const [attempt, setAttempt] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Si cambia el id (o se sale) antes de que llegue, la respuesta se descarta.
    let isCurrent = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga contra la API, como `DetailView`.
    setState({ category: null, isLoading: true, error: null });
    fetchCategory(id)
      .then(
        (category) =>
          isCurrent && setState({ category, isLoading: false, error: null }),
      )
      .catch(
        (cause) =>
          isCurrent &&
          setState({
            category: null,
            isLoading: false,
            error: toApiError(cause).message,
          }),
      );
    return () => {
      isCurrent = false;
    };
  }, [id, attempt]);

  const fetchPage = useCallback(
    (query: PaginatedQuery) => fetchProducts({ ...query, category_id: id }),
    [id],
  );

  const { category, isLoading, error } = state;

  return (
    // El inset de arriba lo pone el `TopBar`, asi que aqui solo el de abajo.
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["bottom", "left", "right"]}
    >
      {isLoading ? <ActivityIndicator className="mt-10" /> : null}

      {error ? (
        <View className="m-6 gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
          <Text className="text-sm text-danger dark:text-danger-dark">
            {error}
          </Text>
          <Pressable
            onPress={() => setAttempt((current) => current + 1)}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text className="text-sm font-semibold text-brand dark:text-brand-dark">
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : null}

      {category !== null ? (
        <>
          {/* Cabecera */}
          <View className="gap-4 px-6 pt-4">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 dark:bg-brand-dark/25">
                <Ionicons
                  name="pricetags-outline"
                  size={26}
                  color={theme.text}
                />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-2xl font-bold text-content dark:text-content-dark">
                  {category.name}
                </Text>
                <Text className="text-sm text-muted dark:text-muted-dark">
                  {productCountLabel(category.product_count)}
                </Text>
              </View>
              {canEdit ? (
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-element active:opacity-70 dark:bg-element-dark"
                  onPress={() => setIsEditing(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Editar categoria"
                  hitSlop={8}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>

            {canDelete ? <DeleteCategoryButton category={category} /> : null}

            {canSeeProducts ? (
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
                Productos
              </Text>
            ) : null}
          </View>

          {canSeeProducts ? (
            <ItemList
              fetchPage={fetchPage}
              keyExtractor={(product) => product.id}
              renderItem={(product) => (
                <ProductRow product={product} hasAction={false} />
              )}
              searchPlaceholder="Buscar en esta categoria"
              emptyLabel="Esta categoria no tiene productos."
              detail={PRODUCT_DETAIL}
            />
          ) : null}
        </>
      ) : null}

      {category !== null && canEdit ? (
        <EditModal
          // `FormModal` lee `initialValues` al montarse: cada version de la
          // categoria es un formulario nuevo.
          key={category.updated_at}
          isVisible={isEditing}
          title="Editar categoria"
          fields={CATEGORY_FIELDS}
          initialValues={{ name: category.name }}
          submit={(changes) => updateCategory(category.id, changes)}
          onClose={() => setIsEditing(false)}
          onSaved={(saved) => {
            setIsEditing(false);
            setState({ category: saved, isLoading: false, error: null });
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const PRODUCT_DETAIL: ItemDetailLink<Product> = {
  href: (product) => ({ pathname: "/products/[id]", params: { id: product.id } }),
  label: (product) => product.name,
};

function DeleteCategoryButton({ category }: { category: CategoryWithCount }) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <View>
      <Pressable
        className="items-center rounded-xl border border-danger/40 py-3 active:opacity-70"
        onPress={() => setIsConfirming(true)}
        accessibilityRole="button"
      >
        <Text className="text-sm font-semibold text-danger dark:text-danger-dark">
          Eliminar categoria
        </Text>
      </Pressable>
      <ConfirmModal
        isVisible={isConfirming}
        title="Eliminar categoria"
        message={
          category.product_count > 0
            ? `Se eliminara "${category.name}", que tiene ${productCountLabel(category.product_count)}.`
            : `Se eliminara "${category.name}".`
        }
        confirmLabel="Eliminar"
        busyLabel="Eliminando..."
        confirm={() => deleteCategory(category.id)}
        onClose={() => setIsConfirming(false)}
        onDone={() => {
          setIsConfirming(false);
          // A la lista: alli ya no sale (sin `include_deleted`). Sin historial
          // (web tras recargar) se va a ella directamente.
          if (router.canGoBack()) router.back();
          else router.replace("/categories");
        }}
      />
    </View>
  );
}
