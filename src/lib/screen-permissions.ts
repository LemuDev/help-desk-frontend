import type Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';

import type { PermissionRequirement } from '@/types';
import { Action, Resource } from '@/types';

type ScreenPermission = PermissionRequirement & {
  /** Titulo del `TopBar` y etiqueta en el sidebar. */
  title: string;
  /**
   * Solo las pantallas que salen en el sidebar. Las de detalle (`[id]`) no
   * tienen una ruta fija: se llega a ellas desde su lista.
   */
  sidebar?: {
    /** La ruta, comprobada por las rutas tipadas de Expo Router. */
    href: Href;
    icon: ComponentProps<typeof Ionicons>['name'];
  };
  /**
   * Solo las de detalle: su lista. El `TopBar` lleva siempre boton atras y, si
   * no hay pantalla anterior a la que volver (tab bar de los clientes, o en web
   * tras recargar o entrar por URL), vuelve aqui.
   */
  parent?: Href;
  /**
   * El `parent` en el tab bar de los clientes, cuando el de siempre no existe
   * para ellos (p.ej. `/companies`, que pide `company:read`).
   */
  customerParent?: Href;
  /**
   * Solo las que salen como pestana en el tab bar de los clientes. El resto se
   * monta igual en `Tabs`, pero con `href: null`.
   */
  tab?: {
    label: string;
    icon: ComponentProps<typeof Ionicons>['name'];
    iconFocused: ComponentProps<typeof Ionicons>['name'];
  };
};

/**
 * Permiso que exige cada pantalla, por nombre de ruta (`src/app/(app)/<nombre>.tsx`,
 * o `<recurso>/index` y `<recurso>/[id]` para lista y detalle).
 *
 * `index`, `profile` y `login` no estan aqui a proposito: las dos primeras las
 * cubre el guard de sesion y la ultima es justo lo contrario. Todo lo demas
 * entra por esta tabla, que leen dos sitios: `src/app/(app)/_layout.tsx` monta
 * un `Stack.Protected` por pantalla, y el `Sidebar` lista solo las que el
 * usuario puede abrir.
 *
 * Expo Router incluye en el Stack cualquier ruta que el layout no mencione, asi
 * que una pantalla nueva que no se apunte aqui queda abierta a cualquiera con
 * sesion: anadir la fila es el paso que la protege.
 */
export const SCREEN_PERMISSIONS: Record<string, ScreenPermission> = {
  'tickets/index': {
    resource: Resource.ticket,
    action: Action.read,
    title: 'Tickets',
    sidebar: { href: '/tickets', icon: 'ticket-outline' },
    tab: { label: 'Tickets', icon: 'ticket-outline', iconFocused: 'ticket' },
  },
  'tickets/[id]': {
    resource: Resource.ticket,
    action: Action.read,
    title: 'Ticket',
    parent: '/tickets',
  },
  'users/index': {
    resource: Resource.user,
    action: Action.read,
    title: 'Usuarios',
    sidebar: { href: '/users', icon: 'people-outline' },
  },
  'users/[id]': {
    resource: Resource.user,
    action: Action.read,
    title: 'Usuario',
    parent: '/users',
  },
  // Los clientes son usuarios de la API: mismo permiso que `users/`.
  'customers/index': {
    resource: Resource.user,
    action: Action.read,
    title: 'Clientes',
    sidebar: { href: '/customers', icon: 'person-circle-outline' },
    // Para el admin de una empresa son sus usuarios: la API solo le devuelve
    // los clientes de su empresa (`UserController.get_users`).
    tab: { label: 'Usuarios', icon: 'people-outline', iconFocused: 'people' },
  },
  'customers/[id]': {
    resource: Resource.user,
    action: Action.read,
    title: 'Cliente',
    parent: '/customers',
  },
  'companies/index': {
    resource: Resource.company,
    action: Action.read,
    title: 'Empresas',
    sidebar: { href: '/companies', icon: 'business-outline' },
  },
  'companies/[id]/index': {
    resource: Resource.company,
    action: Action.read,
    title: 'Empresa',
    parent: '/companies',
  },
  // `parent` es una ruta fija y estas cuelgan de una empresa concreta: sin
  // historial se vuelve a la lista de empresas.
  'companies/[id]/branches/index': {
    resource: Resource.branch,
    action: Action.read,
    title: 'Sucursales',
    parent: '/companies',
    customerParent: '/my-company',
  },
  'companies/[id]/branches/[branchId]': {
    resource: Resource.branch,
    action: Action.read,
    title: 'Sucursal',
    parent: '/companies',
    customerParent: '/my-company',
  },
  'products/index': {
    resource: Resource.product,
    action: Action.read,
    title: 'Productos',
    sidebar: { href: '/products', icon: 'cube-outline' },
  },
  'products/[id]': {
    resource: Resource.product,
    action: Action.read,
    title: 'Producto',
    parent: '/products',
  },
  'categories/index': {
    resource: Resource.category,
    action: Action.read,
    title: 'Categorias',
    sidebar: { href: '/categories', icon: 'pricetags-outline' },
  },
  'categories/[id]': {
    resource: Resource.category,
    action: Action.read,
    title: 'Categoria',
    parent: '/categories',
  },
  'roles/index': {
    resource: Resource.role,
    action: Action.read,
    title: 'Roles',
    sidebar: { href: '/roles', icon: 'shield-checkmark-outline' },
  },
  'roles/[id]': {
    resource: Resource.role,
    action: Action.read,
    title: 'Rol',
    parent: '/roles',
  },
};
