import { api } from '@/lib/api';
import type {
  CategoryCreate,
  CategoryListQuery,
  CategoryPage,
  CategoryUpdate,
  CategoryWithCount,
  Product,
  ProductCreate,
  ProductListQuery,
  ProductPage,
  ProductUpdate,
} from '@/types';

/**
 * `GET /products` — exige `product:read`. Por nombre y sin los borrados salvo
 * `include_deleted`.
 */
export async function fetchProducts({ search, ...params }: ProductListQuery = {}): Promise<ProductPage> {
  const { data } = await api.get<ProductPage>('/products', {
    // El router lo llama `q` y busca en nombre y numero de serie. Vacio se omite.
    params: { ...params, q: search || undefined },
  });
  return data;
}

/** `GET /products/{id}` — mismo permiso que la lista. */
export async function fetchProduct(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}

/** `POST /products` — exige `product:create`. 409 si el nombre ya existe. */
export async function createProduct(payload: ProductCreate): Promise<Product> {
  const { data } = await api.post<Product>('/products', payload);
  return data;
}

/** `PATCH /products/{id}` — exige `product:update`. */
export async function updateProduct(id: string, payload: ProductUpdate): Promise<Product> {
  const { data } = await api.patch<Product>(`/products/${id}`, payload);
  return data;
}

/**
 * `DELETE /products/{id}` — exige `product:delete`. Borrado logico: los
 * tickets que lo referencian lo conservan.
 */
export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

/** `GET /categories` — exige `category:read`. El router lo llama `name`. */
export async function fetchCategories({ search, ...params }: CategoryListQuery = {}): Promise<CategoryPage> {
  const { data } = await api.get<CategoryPage>('/categories', {
    params: { ...params, name: search || undefined },
  });
  return data;
}

/** `GET /categories/{id}` — mismo permiso que la lista. */
export async function fetchCategory(id: string): Promise<CategoryWithCount> {
  const { data } = await api.get<CategoryWithCount>(`/categories/${id}`);
  return data;
}

/** `POST /categories` — exige `category:create`. 409 si el nombre ya existe. */
export async function createCategory(payload: CategoryCreate): Promise<CategoryWithCount> {
  const { data } = await api.post<CategoryWithCount>('/categories', payload);
  return data;
}

/** `PATCH /categories/{id}` — exige `category:update`. */
export async function updateCategory(id: string, payload: CategoryUpdate): Promise<CategoryWithCount> {
  const { data } = await api.patch<CategoryWithCount>(`/categories/${id}`, payload);
  return data;
}

/**
 * `DELETE /categories/{id}` — exige `category:delete`. Borrado logico: sus
 * productos la pierden, pero restaurarla se la devuelve.
 */
export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
}
