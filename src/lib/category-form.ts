import type { FormField } from '@/components/form-modal';
import type { CategoryCreate } from '@/types';

/** Los mismos limites que `Name` en `app/modules/catalog/schemas.py`. */
export const CATEGORY_FIELDS: FormField<CategoryCreate>[] = [
  {
    type: 'text',
    name: 'name',
    label: 'Nombre',
    hint: 'Unico. Maximo 100 caracteres.',
    minLength: 1,
  },
];

/** `CategoryWithCount.product_count` en castellano: "1 producto", "3 productos". */
export function productCountLabel(count: number): string {
  if (count === 0) return 'Sin productos';
  return count === 1 ? '1 producto' : `${count} productos`;
}
