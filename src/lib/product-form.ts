import type { ChoiceOption, FormField } from '@/components/form-modal';
import { fetchCategories } from '@/services/catalog';
import type { Product, ProductCreate, ProductUpdate } from '@/types';

/**
 * Campos del formulario de producto para `CreateModal`/`EditModal`, y la
 * traduccion entre esos valores y lo que espera la API.
 */

export type ProductFormValues = {
  name: string;
  /** Vacia = sin descripcion (`null`). */
  description: string;
  /** Vacio = sin numero de serie (`null`). */
  serial: string;
  category_ids: string[];
};

/** El tope de `size` de la API (`PageParams`): con mas, las ultimas no salen. */
const PICKER_SIZE = 50;

// Cargador de modulo: `FormModal` lo quiere estable.
async function loadCategories(): Promise<ChoiceOption[]> {
  const page = await fetchCategories({ size: PICKER_SIZE });
  return page.items.map(({ id, name }) => ({ value: id, label: name }));
}

/** Los mismos limites que `Name`, `Description` y `Serial` en `app/modules/catalog/schemas.py`. */
export const PRODUCT_FIELDS: FormField<ProductFormValues>[] = [
  {
    type: 'text',
    name: 'name',
    label: 'Nombre',
    hint: 'Unico. Maximo 100 caracteres.',
    minLength: 1,
  },
  {
    type: 'text',
    name: 'serial',
    label: 'Numero de serie',
    hint: 'Opcional. Maximo 255 caracteres.',
    inputProps: { autoCapitalize: 'characters' },
  },
  {
    type: 'text',
    name: 'description',
    label: 'Descripcion',
    hint: 'Opcional. Maximo 2000 caracteres.',
    multiline: true,
  },
  {
    type: 'multichoice',
    name: 'category_ids',
    label: 'Categorias',
    placeholder: 'Sin categorias',
    emptyLabel: 'No hay categorias.',
    options: loadCategories,
  },
];

export const EMPTY_PRODUCT: ProductFormValues = {
  name: '',
  description: '',
  serial: '',
  category_ids: [],
};

export function productToFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    description: product.description ?? '',
    serial: product.serial ?? '',
    category_ids: product.categories.map((category) => category.id),
  };
}

/**
 * Los schemas recortan y piden al menos un caracter, asi que una cadena vacia
 * daria 422: vacio se envia como `null`, que en el PATCH borra el valor.
 */
export function toProductCreate(values: ProductFormValues): ProductCreate {
  return {
    name: values.name,
    description: values.description || null,
    serial: values.serial || null,
    category_ids: values.category_ids,
  };
}

/** Igual que `toProductCreate`, pero solo con lo que cambio (`EditModal`). */
export function toProductUpdate(changes: Partial<ProductFormValues>): ProductUpdate {
  const payload: ProductUpdate = { ...changes };
  if ('description' in changes) payload.description = changes.description || null;
  if ('serial' in changes) payload.serial = changes.serial || null;
  return payload;
}
