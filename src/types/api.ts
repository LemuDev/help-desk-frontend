/**
 * Espeja `app/core/schemas.py`: las piezas que comparten todos los modulos.
 */

/** `GenericResponse`. `response_type` es 1 en exito y -1 en error. */
export type GenericResponse<DataT = unknown> = {
  detail: string;
  response_type: number;
  data?: DataT;
};

export const ResponseType = {
  success: 1,
  error: -1,
} as const;

/** `PageParams` — el backend los expone como query params. */
export type PageParams = {
  page?: number;
  size?: number;
};

/** `Page[ItemT]`. */
export type Page<ItemT> = {
  items: ItemT[];
  total: number;
  page: number;
  size: number;
  pages: number;
};

/**
 * Lo que `usePaginated` manda a un endpoint de lista. `search` es del lado del
 * cliente: cada service lo traduce al query param que use su router (en
 * `/users` es `name`).
 */
export type PaginatedQuery = PageParams & {
  search?: string;
};

/** Error ya normalizado: lo que las pantallas pueden mostrar tal cual. */
export type ApiError = {
  message: string;
  /** Ausente si la peticion nunca llego a tener respuesta (red, timeout). */
  status?: number;
  isNetworkError: boolean;
};