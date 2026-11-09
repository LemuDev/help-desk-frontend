import type { ChoiceOption, FormField } from '@/components/form-modal';
import { can } from '@/lib/permissions';
import { fetchBranches, fetchCompanies } from '@/services/companies';
import { fetchRoles } from '@/services/roles';
import { Action, Resource } from '@/types';
import type { CurrentUser, User, UserUpdate } from '@/types';

/**
 * Campos del formulario de usuario para `CreateModal`/`EditModal`, y la
 * traduccion entre esos valores y lo que espera la API.
 */

export type UserFormValues = {
  full_name: string;
  username: string;
  /** Al editar, vacia = no cambiarla. */
  password: string;
  /** Personal que atiende tickets. Apagado = cliente. */
  is_worker: boolean;
  /** Se salta todos los permisos. */
  is_superuser: boolean;
  is_active: boolean;
  company_id: number | null;
  branch_id: number | null;
  /**
   * Uno solo, aunque `role_ids` admite varios: se envia como lista de uno. Con
   * varios en la API se muestra el primero, y solo se tocan si se cambia.
   */
  role_id: number | null;
};

/**
 * Que seccion usa el formulario: Usuarios (personal) o Clientes. Lo decide la
 * pantalla, asi que el formulario no deja cambiarlo: un cliente convertido en
 * personal (o al reves) desapareceria de la lista en la que se edita.
 */
export type UserKind = 'staff' | 'customer';

/** El tope de `size` de la API (`PageParams`): con mas, las ultimas no salen. */
const PICKER_SIZE = 50;

/**
 * Personal = no cliente, la misma regla que `isCustomer()` en
 * `@/lib/permissions`: un superusuario cuenta aunque no lleve `is_worker`.
 */
function isStaff(values: Pick<UserFormValues, 'is_worker' | 'is_superuser'>): boolean {
  return values.is_worker || values.is_superuser;
}

// Cargadores de modulo: `FormModal` los quiere estables.
async function loadCompanies(): Promise<ChoiceOption[]> {
  const page = await fetchCompanies({ size: PICKER_SIZE });
  return page.items.map(({ id, name }) => ({ value: id, label: name }));
}

async function loadBranches(values: UserFormValues): Promise<ChoiceOption[]> {
  if (values.company_id === null) return [];
  const page = await fetchBranches(values.company_id, { size: PICKER_SIZE });
  return page.items.map(({ id, name }) => ({ value: id, label: name }));
}

/**
 * Los globales y los de la empresa del usuario: `UserController._resolve_roles`
 * no comprueba la empresa del rol, asi que no se ofrece uno de otra. El
 * personal no es de ninguna empresa, asi que solo ve los globales.
 */
async function loadRoles(values: UserFormValues): Promise<ChoiceOption[]> {
  const companyId = isStaff(values) ? null : values.company_id;
  const page = await fetchRoles({ size: PICKER_SIZE });
  return page.items
    .filter((role) => role.company_id === null || role.company_id === companyId)
    .map(({ id, name }) => ({ value: id, label: name }));
}

export function toFormValues(user: User): UserFormValues {
  return {
    full_name: user.full_name,
    username: user.username,
    password: '',
    is_worker: user.is_worker,
    is_superuser: user.is_superuser,
    is_active: user.is_active,
    company_id: user.company_id,
    branch_id: user.branch_id,
    role_id: user.roles[0]?.id ?? null,
  };
}

/**
 * Lo que cambio en el formulario, como body de `PATCH /users/{id}`: la
 * contrasena vacia no se manda, y encender `is_worker` o `is_superuser`
 * desasigna empresa y sucursal (ver `userFormFields`).
 */
export function toUpdatePayload({
  password,
  role_id,
  ...rest
}: Partial<UserFormValues>): UserUpdate {
  return {
    ...rest,
    // `role_ids` reemplaza la lista entera; `null` = sin rol.
    ...(role_id !== undefined ? { role_ids: role_id === null ? [] : [role_id] } : {}),
    ...(rest.is_worker || rest.is_superuser ? { company_id: null, branch_id: null } : {}),
    ...(password ? { password } : {}),
  };
}

/**
 * Solo un superusuario ve (y puede cambiar) `is_superuser`, igual que en la
 * API (`UserController._guard_flags`). Empresa y sucursal salen solo si se pueden leer,
 * y solo para clientes: el personal atiende a todas las empresas, asi que no
 * es de ninguna.
 *
 * `is_worker` no se pinta: lo fija `kind` (ver `UserKind`). En `customer`
 * tampoco sale `is_superuser`, que tambien lo haria personal.
 */
export function userFormFields(
  currentUser: CurrentUser | null,
  mode: 'create' | 'edit',
  kind: UserKind,
): FormField<UserFormValues>[] {
  const isSuperuser = Boolean(currentUser?.is_superuser);
  const isCustomerForm = kind === 'customer';

  return [
    { type: 'text', name: 'full_name', label: 'Nombre completo', minLength: 1 },
    {
      type: 'text',
      name: 'username',
      label: 'Usuario',
      hint: 'Minimo 3 caracteres',
      minLength: 3,
      inputProps: { autoCapitalize: 'none' },
    },
    {
      type: 'text',
      name: 'password',
      label: mode === 'edit' ? 'Nueva contrasena' : 'Contrasena',
      hint: mode === 'edit' ? 'Vacia para no cambiarla. Minimo 8 caracteres.' : 'Minimo 8 caracteres',
      minLength: 8,
      optional: mode === 'edit',
      // Un espacio al principio o al final es parte de la contrasena.
      trim: false,
      secure: true,
      inputProps: { autoCapitalize: 'none', autoComplete: 'new-password', textContentType: 'newPassword' },
    },
    {
      type: 'switch',
      name: 'is_worker',
      label: 'Es trabajador',
      hint: 'Personal que atiende tickets. Apagado, es un cliente.',
      hidden: true,
    },
    {
      type: 'switch',
      name: 'is_superuser',
      label: 'Superusuario',
      hint: 'Se salta todos los permisos.',
      hidden: !isSuperuser || isCustomerForm,
    },
    {
      type: 'choice',
      name: 'company_id',
      label: 'Empresa',
      // Un cliente siempre es de una empresa; el personal no ve el campo.
      hint: 'Obligatoria para clientes.',
      options: loadCompanies,
      display: 'select',
      placeholder: 'Elegir empresa',
      required: true,
      emptyLabel: 'No hay empresas.',
      hidden: (values) =>
        isStaff(values) || !can(currentUser, Resource.company, Action.read),
    },
    {
      type: 'choice',
      name: 'branch_id',
      label: 'Sucursal',
      hint: 'Opcional.',
      options: loadBranches,
      dependsOn: ['company_id'],
      display: 'select',
      placeholder: 'Sin sucursal',
      clearable: true,
      emptyLabel: 'Esta empresa no tiene sucursales.',
      hidden: (values) =>
        isStaff(values) ||
        values.company_id === null ||
        !can(currentUser, Resource.branch, Action.read),
    },
    {
      type: 'choice',
      name: 'role_id',
      label: 'Rol',
      hint: 'Opcional. Globales y, para clientes, los de su empresa.',
      options: loadRoles,
      // Cambiar de empresa o pasar a personal cambia que roles valen: se vacia y recarga.
      dependsOn: ['company_id', 'is_worker', 'is_superuser'],
      display: 'select',
      placeholder: 'Sin rol',
      clearable: true,
      emptyLabel: 'No hay roles.',
      hidden: !can(currentUser, Resource.role, Action.read),
    },
    { type: 'switch', name: 'is_active', label: 'Cuenta activa' },
  ];
}