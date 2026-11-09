/**
 * Espeja `app/modules/catalog/schemas.py`.
 */

import type { Page, PaginatedQuery } from './api';

/** `CategoryRead`. */
export type Category = {
  id: string;
  name: string;
  /** Con valor solo si se pidio `include_deleted`. */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `CategoryWithCount` — lo que devuelven los endpoints de `/categories`. La
 * `Category` anidada en un producto no lo lleva.
 */
export type CategoryWithCount = Category & {
  /** Solo los productos vivos. */
  product_count: number;
};

/** `CategoryCreate` — body de `POST /categories`. Unico, 1-100 caracteres. */
export type CategoryCreate = {
  name: string;
};

/** `CategoryUpdate` — body de `PATCH /categories/{id}`. */
export type CategoryUpdate = Partial<CategoryCreate>;

/** `ProductRead`. `categories` son solo las vivas (`active_categories`). */
export type Product = {
  id: string;
  name: string;
  description: string | null;
  serial: string | null;
  categories: Category[];
  /** Con valor solo si se pidio `include_deleted`. */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `ProductCreate` — body de `POST /products`. El nombre es unico (409 si se
 * repite). `description` y `serial` no aceptan cadena vacia: sin valor van a
 * `null`.
 */
export type ProductCreate = {
  /** 1-100 caracteres, recortado. */
  name: string;
  /** 1-2000 caracteres, recortado. */
  description?: string | null;
  /** 1-255 caracteres, recortado. */
  serial?: string | null;
  category_ids?: string[];
};

/**
 * `ProductUpdate` — body de `PATCH /products/{id}`. Un null en `description`
 * o `serial` borra el valor; en `name` y `category_ids` es un no-op. Para
 * dejarlo sin categorias se manda la lista vacia.
 */
export type ProductUpdate = {
  name?: string;
  description?: string | null;
  serial?: string | null;
  category_ids?: string[];
};

/** Query params de `GET /products`. `search` busca en nombre y serie. */
export type ProductListQuery = PaginatedQuery & {
  category_id?: string;
  include_deleted?: boolean;
};

/** Query params de `GET /categories`. */
export type CategoryListQuery = PaginatedQuery & {
  include_deleted?: boolean;
};

export type ProductPage = Page<Product>;
export type CategoryPage = Page<CategoryWithCount>;