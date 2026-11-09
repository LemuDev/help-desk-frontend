import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { toApiError } from "@/lib/api";
import { toDetailFields, type DetailFieldOptions } from "@/lib/detail-fields";

export type DetailConfig<DetailT> = DetailFieldOptions & {
  title: (data: DetailT) => string;
  subtitle?: (data: DetailT) => string;
  /** Trae el registro por el id de la URL, p.ej. `GET /users/{id}`. */
  fetch: (id: string) => Promise<DetailT>;
};

/**
 * El cuerpo de una pantalla de detalle (`src/app/(app)/<recurso>/[id].tsx`):
 * pide el registro y pinta lo que venga via `toDetailFields`, asi que cada
 * recurso solo describe su `DetailConfig`. Es pagina y no modal para que el
 * detalle tenga URL propia y el boton atras vuelva a la lista.
 */
export function DetailView<DetailT>({
  id,
  detail,
  children,
}: {
  id: string;
  detail: DetailConfig<DetailT>;
  /**
   * Bajo los campos, ya con el registro cargado: acciones o enlaces que dependen
   * de el (p.ej. las sucursales de una empresa, o eliminar).
   */
  children?: (data: DetailT) => ReactNode;
}) {
  const [state, setState] = useState<{
    data: DetailT | null;
    isLoading: boolean;
    error: string | null;
  }>({ data: null, isLoading: true, error: null });
  // Subirlo relanza la carga: es el "Reintentar".
  const [attempt, setAttempt] = useState(0);

  const fetchDetail = detail.fetch;

  useEffect(() => {
    // Si cambia el id (o se sale) antes de que llegue, la respuesta se descarta.
    let isCurrent = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga contra la API, como `usePaginated`.
    setState({ data: null, isLoading: true, error: null });
    fetchDetail(id)
      .then((data) => isCurrent && setState({ data, isLoading: false, error: null }))
      .catch(
        (cause) =>
          isCurrent &&
          setState({ data: null, isLoading: false, error: toApiError(cause).message }),
      );
    return () => {
      isCurrent = false;
    };
  }, [fetchDetail, id, attempt]);

  const { data, isLoading, error } = state;

  return (
    // El inset de arriba lo pone el `TopBar`, asi que aqui solo el de abajo.
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["bottom", "left", "right"]}
    >
      {isLoading ? <ActivityIndicator className="mt-10" /> : null}

      {error ? (
        <View className="m-6 gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
          <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
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

      {data !== null ? (
        <ScrollView contentContainerClassName="px-6 pb-8 pt-4">
          <Text className="text-2xl font-bold text-content dark:text-content-dark">
            {detail.title(data)}
          </Text>
          {detail.subtitle ? (
            <Text className="mt-0.5 text-sm text-muted dark:text-muted-dark">
              {detail.subtitle(data)}
            </Text>
          ) : null}

          <View className="mt-4">
            {toDetailFields(data, {
              labels: detail.labels,
              hide: detail.hide,
              format: detail.format,
            }).map(
              (field) => (
                <View
                  key={field.label}
                  className="flex-row items-start justify-between gap-4 border-b border-selected py-3 dark:border-selected-dark"
                >
                  <Text className="text-sm text-muted dark:text-muted-dark">
                    {field.label}
                  </Text>
                  <Text className="flex-1 text-right text-sm font-medium text-content dark:text-content-dark">
                    {field.value}
                  </Text>
                </View>
              ),
            )}
          </View>

          {children ? <View className="mt-6 gap-3">{children(data)}</View> : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
