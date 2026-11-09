import { Action, Resource } from '@/types';
import type { CurrentUser, PermissionCode } from '@/types';

/**
 * Lectura de los permisos que concede el backend.
 *
 * Espeja `User.can()` de `app/modules/users/models.py`, con sus dos atajos: un
 * superusuario puede todo, y `<recurso>:manage` cubre cualquier accion sobre
 * ese recurso. Comprobar `permissions.includes('user:read')` a pelo se
 * equivocaria con un admin, que solo tiene `user:manage`.
 *
 * Esto solo decide que se ofrece y que pantallas existen: la barrera real sigue
 * siendo `require_permission` en la API.
 */
export function can(
  user: CurrentUser | null,
  resource: Resource,
  action: Action,
): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;

  return (
    hasCode(user, `${resource}:${action}`) || hasCode(user, `${resource}:${Action.manage}`)
  );
}

/**
 * Cliente = quien abre tickets, no quien los atiende. Se decide por
 * `is_worker` y no por el rol `customer`: una empresa puede crear roles propios
 * para sus clientes, pero el flag es siempre el mismo. Un superusuario nunca
 * cuenta como cliente aunque no tenga el flag.
 */
export function isCustomer(user: CurrentUser | null): boolean {
  return user !== null && !user.is_worker && !user.is_superuser;
}

/**
 * Quien puede elegir la empresa global (`useCompanyScopeStore`): el personal
 * que puede listar empresas. Un cliente ya tiene la suya fijada por la API
 * (`CompanyScope` en `app/modules/auth/deps.py`).
 */
export function canPickCompanyScope(user: CurrentUser | null): boolean {
  return !isCustomer(user) && can(user, Resource.company, Action.read);
}

function hasCode(user: CurrentUser, code: PermissionCode): boolean {
  return user.permissions.includes(code);
}
