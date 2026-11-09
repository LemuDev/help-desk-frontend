import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

import { usePaginated } from "@/hooks/use-paginated";
import { useTheme } from "@/hooks/use-theme";
import type { Page, PaginatedQuery } from "@/types";

/** A donde lleva tocar una fila: la pantalla de detalle del recurso. */
export type ItemDetailLink<ItemT> = {
  href: (item: ItemT) => Href;
  /** Lo que lee el lector de pantalla en la fila. */
  label: (item: ItemT) => string;
};

type ItemListProps<ItemT> = {
  /** Estable: funcion de modulo o envuelta en `useCallback`. */
  fetchPage: (query: PaginatedQuery) => Promise<Page<ItemT>>;
  keyExtractor: (item: ItemT) => string;
  renderItem: (item: ItemT) => ReactElement;
  /**
   * Boton(es) a la derecha de la fila, p.ej. editar. Va encima de la fila y no
   * dentro: anidar un `Pressable` en el que abre el detalle es un `<button>`
   * dentro de otro en web. La fila tiene que dejarle hueco a la derecha.
   */
  renderAction?: (item: ItemT) => ReactElement | null;
  /** Con un placeholder aparece el buscador; sin el, no hay buscador. */
  searchPlaceholder?: string;
  /**
   * Controles bajo el buscador, p.ej. `BranchFilter`. Lo que filtran va
   * en `fetchPage`: al cambiar su identidad la lista vuelve a la pagina 1.
   */
  filters?: ReactNode;
  /** Lo que se dice cuando no hay nada (sin buscar). */
  emptyLabel?: string;
  size?: number;
  /** Con esto las filas se pueden tocar y abren su pantalla de detalle. */
  detail?: ItemDetailLink<ItemT>;
};

/** Lo que se espera a que el usuario pare de teclear antes de pedir a la API. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Lista de items paginada, con buscador, recarga y scroll infinito; cada fila
 * puede llevar a su detalle. Todo lo que cambia de un recurso a otro entra por
 * props, asi que una pantalla nueva solo necesita su `fetchPage` y como pintar
 * una fila.
 */
export function ItemList<ItemT>({
  fetchPage,
  keyExtractor,
  renderItem,
  renderAction,
  searchPlaceholder,
  filters,
  emptyLabel = "No hay nada todavia.",
  size,
  detail,
}: ItemListProps<ItemT>) {
  const theme = useTheme();

  // `query` es lo que se ve escrito; `search` lo que ya se pidio a la API.
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (query === search) return;
    const timer = setTimeout(() => setSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, search]);

  const {
    items,
    total,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  } = usePaginated(fetchPage, {
    size,
    search,
    keyOf: keyExtractor,
  });

  const isSearching = search.length > 0;
  const isEmpty = items.length === 0;
  // Primera carga: no hay nada que mostrar todavia, ni un error que explique por que.
  const isFirstLoad = isLoading && isEmpty && !error;
  // Recarga por busqueda: la lista se queda y el spinner va junto al contador.
  const isReloading = isLoading && !isRefreshing && !isEmpty;

  return (
    <View className="flex-1">
      {searchPlaceholder ? (
        <View className="px-6 pb-2 pt-4">
          <View className="flex-row items-center gap-2 rounded-xl border border-selected bg-element px-3 dark:border-selected-dark dark:bg-element-dark">
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              className="flex-1 py-3 text-base text-content dark:text-content-dark"
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={searchPlaceholder}
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery("")}
                accessibilityRole="button"
                accessibilityLabel="Limpiar busqueda"
                hitSlop={8}
                className="active:opacity-60"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {filters ? (
        <View className={`px-6 pb-2 ${searchPlaceholder ? "" : "pt-4"}`}>
          {filters}
        </View>
      ) : null}

      <View className="h-6 flex-row items-center gap-2 px-6">
        {!isFirstLoad ? (
          <Text className="text-sm text-muted dark:text-muted-dark">
            {isEmpty ? "Sin resultados" : `${items.length} de ${total}`}
          </Text>
        ) : null}
        {isReloading ? <ActivityIndicator size="small" /> : null}
      </View>

      {isFirstLoad ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          contentContainerClassName="px-6 pb-8 pt-2 gap-3"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const row = detail ? (
              <Pressable
                className="active:opacity-70"
                onPress={() => router.push(detail.href(item))}
                accessibilityRole="button"
                accessibilityLabel={detail.label(item)}
              >
                {renderItem(item)}
              </Pressable>
            ) : (
              renderItem(item)
            );
            const action = renderAction?.(item);
            if (!action) return row;

            return (
              <View className="justify-center">
                {row}
                <View className="absolute right-3">{action}</View>
              </View>
            );
          }}
          // Tirar desde arriba vuelve a la pagina 1.
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={theme.textSecondary}
              colors={[theme.text]}
            />
          }
          // Al acercarse al final se pide la pagina siguiente, si queda alguna.
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            error ? (
              <ErrorBox
                message={error}
                onRetry={refresh}
                isRetrying={isLoading}
              />
            ) : (
              <Text className="text-sm text-muted dark:text-muted-dark">
                {isSearching
                  ? `Nada que coincida con "${search}".`
                  : emptyLabel}
              </Text>
            )
          }
          ListFooterComponent={
            <ListFooter
              isLoadingMore={isLoadingMore}
              isComplete={!hasMore && !isEmpty}
              // Un fallo al paginar no se come la lista: se avisa al final.
              error={isEmpty ? null : error}
              onRetry={loadMore}
            />
          }
        />
      )}
    </View>
  );
}

function ListFooter({
  isLoadingMore,
  isComplete,
  error,
  onRetry,
}: {
  isLoadingMore: boolean;
  isComplete: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error)
    return <ErrorBox message={error} onRetry={onRetry} isRetrying={false} />;
  if (isLoadingMore) return <ActivityIndicator className="py-4" />;

  // Decir que se acabo evita el "¿se quedo cargando?" al llegar al final.
  if (isComplete) {
    return (
      <Text className="py-4 text-center text-xs text-muted dark:text-muted-dark">
        Fin de la lista
      </Text>
    );
  }

  return null;
}

function ErrorBox({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  /** Con la lista vacia no se ve el spinner de recargar: lo dice el boton. */
  isRetrying: boolean;
}) {
  return (
    <View className="gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
      <Text className="text-sm text-danger dark:text-danger-dark">
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        disabled={isRetrying}
        accessibilityRole="button"
        accessibilityState={{ disabled: isRetrying, busy: isRetrying }}
        hitSlop={8}
      >
        <Text className="text-sm font-semibold text-brand dark:text-brand-dark">
          {isRetrying ? "Reintentando..." : "Reintentar"}
        </Text>
      </Pressable>
    </View>
  );
}
