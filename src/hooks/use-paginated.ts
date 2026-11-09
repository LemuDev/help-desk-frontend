import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '@/lib/api';
import type { Page, PaginatedQuery } from '@/types';

/**
 * Estado de una lista paginada contra cualquier endpoint que devuelva
 * `Page[ItemT]` (`app/core/schemas.py`): primera carga, recarga tirando desde
 * arriba, busqueda y paginas siguientes al llegar al final.
 *
 * `fetchPage` tiene que ser estable —una funcion de modulo como `fetchUsers`, o
 * envuelta en `useCallback`—: cambiar de identidad en cada render relanzaria la
 * carga. `search` si puede cambiar: al hacerlo se vuelve a la pagina 1.
 */

type FetchPage<ItemT> = (query: PaginatedQuery) => Promise<Page<ItemT>>;

/** `reload` reemplaza la lista (pagina 1); `more` acumula la siguiente. */
type LoadMode = 'reload' | 'more';

const DEFAULT_SIZE = 20;

export function usePaginated<ItemT>(
  fetchPage: FetchPage<ItemT>,
  options: {
    size?: number;
    search?: string;
    /** Identidad de un item, para no repetir uno que ya llego en otra pagina. */
    keyOf?: (item: ItemT) => string;
  } = {},
) {
  const { size = DEFAULT_SIZE, search, keyOf } = options;

  const [items, setItems] = useState<ItemT[]>([]);
  const [total, setTotal] = useState(0);
  /** Ultima pagina cargada. 0 = todavia ninguna. */
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  /** Hay una carga de la pagina 1 en el aire: al montar, al buscar o al recargar. */
  const [isLoading, setIsLoading] = useState(true);
  /** Esa carga salio de tirar desde arriba, no de montar ni de buscar. */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Una recarga invalida lo que estuviera volando: sin esto, una pagina pedida
  // antes podria llegar despues y colarse al final de la lista nueva.
  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);
  // `page` en estado llega un render tarde: `onEndReached` puede saltar entre
  // que termina una pagina y el re-render, y pediria la misma otra vez.
  const pageRef = useRef(0);
  // En un ref para que un `keyExtractor` inline no relance la carga.
  const keyOfRef = useRef(keyOf);
  useEffect(() => {
    keyOfRef.current = keyOf;
  }, [keyOf]);

  const load = useCallback(
    async (target: number, mode: LoadMode) => {
      // `onEndReached` se dispara varias veces por gesto, y pedir la siguiente
      // pagina mientras se recarga la primera mezclaria las dos.
      if (mode === 'more' && isFetchingRef.current) return;

      if (mode === 'reload') {
        requestIdRef.current += 1;
        setIsLoading(true);
      }
      const requestId = requestIdRef.current;
      isFetchingRef.current = true;

      try {
        const result = await fetchPage({ page: target, size, search });
        if (requestId !== requestIdRef.current) return;

        setItems((current) => {
          if (mode === 'reload') return result.items;
          // La paginacion es por offset: si se crea o reordena algo entre una
          // pagina y la siguiente, la frontera se desplaza y un item se repite.
          const getKey = keyOfRef.current;
          if (!getKey) return [...current, ...result.items];
          const seen = new Set(current.map(getKey));
          return [
            ...current,
            ...result.items.filter((item) => !seen.has(getKey(item))),
          ];
        });
        setTotal(result.total);
        pageRef.current = result.page;
        setPage(result.page);
        setPages(result.pages);
        setError(null);
      } catch (cause) {
        if (requestId !== requestIdRef.current) return;
        setError(toApiError(cause).message);
      } finally {
        // Solo la peticion vigente apaga los spinners: una obsoleta los dejaria
        // apagados mientras la de verdad sigue en el aire.
        if (requestId === requestIdRef.current) {
          isFetchingRef.current = false;
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [fetchPage, search, size],
  );

  const hasMore = page > 0 && page < pages;

  /**
   * Pull-to-refresh: vuelve a la pagina 1 sin vaciar lo que ya se ve. Sirve
   * tambien de reintento cuando la carga fallo.
   */
  const refresh = useCallback(() => {
    setIsRefreshing(true);
    void load(1, 'reload');
  }, [load]);

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingRef.current) return;
    setIsLoadingMore(true);
    void load(pageRef.current + 1, 'more');
  }, [hasMore, load]);

  // Monta y, despues, cada cambio de `search`: siempre vuelta a la pagina 1.
  useEffect(() => {
    // La regla marca cualquier carga disparada desde un efecto, pase o no por
    // un await (la plantilla de Expo la incumple igual en
    // `use-color-scheme.web.ts`). Aqui es justo lo que se busca. Quitarla de
    // verdad pediria una libreria de datos tipo TanStack Query, que es otra
    // decision.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1, 'reload');
  }, [load]);

  return {
    items,
    total,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}
