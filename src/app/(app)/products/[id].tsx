import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmModal } from "@/components/confirm-modal";
import { DetailCard, formatDate, InfoRow } from "@/components/detail-card";
import { EditModal } from "@/components/edit-modal";
import { useTheme } from "@/hooks/use-theme";
import { toApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import {
  PRODUCT_FIELDS,
  productToFormValues,
  toProductUpdate,
} from "@/lib/product-form";
import { deleteProduct, fetchProduct, updateProduct } from "@/services/catalog";
import { useAuthStore } from "@/store/auth-store";
import type { Product } from "@/types";
import { Action, Resource } from "@/types";

/**
 * Detalle de un producto (`/products/{id}`). Protegida por `product:read` en
 * `SCREEN_PERMISSIONS`, el mismo permiso que la lista y que
 * `GET /products/{id}`. Con `product:update` se edita desde aqui, y con
 * `product:delete` se elimina (borrado logico).
 */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();
  const canEdit = can(user, Resource.product, Action.update);
  const canDelete = can(user, Resource.product, Action.delete);

  const [state, setState] = useState<{
    product: Product | null;
    isLoading: boolean;
    error: string | null;
  }>({ product: null, isLoading: true, error: null });
  // Subirlo relanza la carga: es el "Reintentar".
  const [attempt, setAttempt] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Si cambia el id (o se sale) antes de que llegue, la respuesta se descarta.
    let isCurrent = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga contra la API, como `DetailView`.
    setState({ product: null, isLoading: true, error: null });
    fetchProduct(id)
      .then(
        (product) =>
          isCurrent && setState({ product, isLoading: false, error: null }),
      )
      .catch(
        (cause) =>
          isCurrent &&
          setState({
            product: null,
            isLoading: false,
            error: toApiError(cause).message,
          }),
      );
    return () => {
      isCurrent = false;
    };
  }, [id, attempt]);

  const { product, isLoading, error } = state;

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

      {product !== null ? (
        <ScrollView contentContainerClassName="w-full max-w-3xl self-center gap-4 px-6 pb-10 pt-4">
          {/* Cabecera */}
          <View className="flex-row items-start gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 dark:bg-brand-dark/25">
              <Ionicons name="cube-outline" size={28} color={theme.text} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-2xl font-bold text-content dark:text-content-dark">
                {product.name}
              </Text>
              {product.serial ? (
                <Text className="text-sm text-muted dark:text-muted-dark">
                  S/N{" "}
                  <Text className="font-semibold text-content dark:text-content-dark">
                    {product.serial}
                  </Text>
                </Text>
              ) : null}
            </View>
            {canEdit ? (
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full bg-element active:opacity-70 dark:bg-element-dark"
                onPress={() => setIsEditing(true)}
                accessibilityRole="button"
                accessibilityLabel="Editar producto"
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

          <DetailCard title="Descripcion">
            <Text
              className={
                product.description
                  ? "text-base leading-6 text-content dark:text-content-dark"
                  : "text-sm text-muted dark:text-muted-dark"
              }
            >
              {product.description ?? "Sin descripcion."}
            </Text>
          </DetailCard>

          <DetailCard title="Categorias">
            {product.categories.length === 0 ? (
              <Text className="text-sm text-muted dark:text-muted-dark">
                Sin categorias.
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {product.categories.map((category) => (
                  <View
                    key={category.id}
                    className="rounded-full bg-brand/15 px-3 py-1 dark:bg-brand-dark/25"
                  >
                    <Text className="text-xs font-semibold text-brand dark:text-brand-dark">
                      {category.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </DetailCard>

          <DetailCard title="Detalles">
            <InfoRow
              icon="barcode-outline"
              label="Numero de serie"
              value={product.serial}
            />
            <InfoRow
              icon="calendar-outline"
              label="Creado"
              value={formatDate(product.created_at)}
            />
            <InfoRow
              icon="time-outline"
              label="Actualizado"
              value={formatDate(product.updated_at)}
            />
          </DetailCard>

          {canDelete ? <DeleteProductButton product={product} /> : null}
        </ScrollView>
      ) : null}

      {product !== null && canEdit ? (
        <EditModal
          // `FormModal` lee `initialValues` al montarse: cada version del
          // producto es un formulario nuevo.
          key={product.updated_at}
          isVisible={isEditing}
          title="Editar producto"
          fields={PRODUCT_FIELDS}
          initialValues={productToFormValues(product)}
          submit={(changes) =>
            updateProduct(product.id, toProductUpdate(changes))
          }
          onClose={() => setIsEditing(false)}
          onSaved={(saved) => {
            setIsEditing(false);
            setState({ product: saved, isLoading: false, error: null });
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function DeleteProductButton({ product }: { product: Product }) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <View className="mt-2">
      <Pressable
        className="items-center rounded-xl border border-danger/40 py-4 active:opacity-70"
        onPress={() => setIsConfirming(true)}
        accessibilityRole="button"
      >
        <Text className="text-base font-semibold text-danger dark:text-danger-dark">
          Eliminar producto
        </Text>
      </Pressable>
      <ConfirmModal
        isVisible={isConfirming}
        title="Eliminar producto"
        message={`Se eliminara "${product.name}". Los tickets que lo usan lo conservan.`}
        confirmLabel="Eliminar"
        busyLabel="Eliminando..."
        confirm={() => deleteProduct(product.id)}
        onClose={() => setIsConfirming(false)}
        onDone={() => {
          setIsConfirming(false);
          // A la lista: alli ya no sale (sin `include_deleted`). Sin historial
          // (web tras recargar) se va a ella directamente.
          if (router.canGoBack()) router.back();
          else router.replace("/products");
        }}
      />
    </View>
  );
}