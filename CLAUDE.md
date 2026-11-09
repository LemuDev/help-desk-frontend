# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Frontend (Expo SDK 57 + Expo Router + NativeWind + Zustand) de una app de helpdesk. Corre en iOS, Android y web (`web.output: "static"`). El backend FastAPI vive en `../backend`.

Lee también `AGENTS.md`: las reglas de Expo (no fiarse de la memoria, consultar la doc versionada de SDK 57, `npx expo install` para dependencias, no tocar `ios/`/`android/`) aplican aquí.

## API del backend

- Documentación interactiva (Swagger) de FastAPI: **http://localhost:8000/docs** — consúltala para ver rutas, schemas y códigos de respuesta antes de escribir un service o un tipo.
- Las rutas van en la raíz, sin prefijo `/api` (`/auth/login`, `/auth/me`, `/users`, ...).
- URL base: `EXPO_PUBLIC_API_URL` (ver `.env.example`). Sin ella, `src/lib/api.ts` deduce el host de Metro (móvil físico) y cae a `http://localhost:8000`. En emulador Android usar `http://10.0.2.2:8000`.

## Comandos

Se usa **pnpm** (con `nodeLinker: hoisted` en `pnpm-workspace.yaml`, necesario para que Babel resuelva `babel-preset-expo`).

```bash
pnpm install
pnpm start              # expo start (pnpm android / ios / web)
pnpm lint               # expo lint
pnpm exec tsc --noEmit  # typecheck
pnpm exec expo install <paquete>  # añadir dependencias con versión compatible con el SDK
```

No hay tests configurados. Antes de dar una tarea por terminada: lint + typecheck.

## Arquitectura

Alias `@/*` → `src/*`. Capas:

- `src/types/` — espejo de los schemas del backend, **un archivo por módulo** (`api.ts` ↔ `app/core/schemas.py`, `user.ts` ↔ `app/modules/users/schemas.py`, ...), reexportados desde `index.ts`. Los enums se escriben como `const X = {...} as const` + `type X` con el mismo nombre (por eso `no-redeclare` está desactivado en esa carpeta). Cada archivo indica en su cabecera qué archivo de Python espeja.
- `src/lib/api.ts` — instancia axios única. El token se inyecta como `Bearer` vía `setAuthToken`; un 401 fuera de `/auth/login` dispara el handler registrado por el auth store (logout). `toApiError` normaliza cualquier error (incluido el `detail` de FastAPI, string o lista de 422) en un mensaje mostrable.
- `src/services/` — una función por endpoint, devuelven `data` tipado. Traducen params del cliente a los del router (p.ej. `search` → `name` en `/users`).
- `src/store/auth-store.ts` — Zustand. `bootstrap()` lee el token (`src/lib/token-storage.ts`: SecureStore en nativo, `localStorage` en web) y lo valida con `/auth/me`, que trae los permisos del usuario. No hay endpoint de logout: es solo borrar el token.
- `src/app/` — rutas de Expo Router (solo pantallas; el resto fuera de `app/`).

### Autenticación y permisos

- `src/app/_layout.tsx` decide sesión sí/no con `Stack.Protected`: `(app)` o `login`. El splash se mantiene mientras `status === 'hydrating'`.
- `src/app/(app)/_layout.tsx` elige la navegación según quién entra: los clientes (`isCustomer()` en `src/lib/permissions.ts`, es decir `!is_worker && !is_superuser`) ven un tab bar y el `TopBar` sin el botón del `Sidebar` (`showSidebar={false}`); el personal, un Stack con el `TopBar` como header. Ambos crean un `Protected` por cada entrada de `SCREEN_PERMISSIONS`. En el tab bar, Tabs genera una pestaña por cada ruta del grupo, así que las que no son del cliente llevan `href: null`.
- `src/lib/screen-permissions.ts` es la fuente de verdad de qué permiso exige cada pantalla (también la lee el `Sidebar`). **Una pantalla nueva en `(app)/` que no se añada a esa tabla queda accesible para cualquiera con sesión.**
- `src/lib/permissions.ts` → `can(user, resource, action)` espeja `User.can()` del backend: superusuario puede todo y `<recurso>:manage` cubre cualquier acción. No comprobar `user.permissions.includes(...)` directamente.

### Listas

`usePaginated` (`src/hooks/use-paginated.ts`) gestiona cualquier endpoint que devuelva `Page[ItemT]` (carga, búsqueda, pull-to-refresh, scroll infinito, descarte de respuestas obsoletas). `fetchPage` debe ser estable (función de módulo o `useCallback`). `ItemList` (`src/components/item-list.tsx`) lo envuelve con búsqueda, y con `detail` cada fila navega a su pantalla de detalle. El detalle es una página, no un modal: `src/app/(app)/<recurso>/[id].tsx` con `DetailView` (`src/components/detail-view.tsx`), que pinta cualquier objeto vía `toDetailFields`. La lista vive en `<recurso>/index.tsx` (un `<recurso>.tsx` junto a la carpeta sería su layout). Un recurso nuevo suele ser: service + tipos + `index.tsx` con `ItemList` + `[id].tsx` con `DetailView` + las dos filas (`<recurso>/index` y `<recurso>/[id]`) en `SCREEN_PERMISSIONS`.

### Estilos

NativeWind (Tailwind 3). Los colores de `tailwind.config.js` espejan `src/constants/theme.ts`; cada token se usa con su variante oscura: `bg-surface dark:bg-surface-dark`.

## Convenciones

- Comentarios y textos de UI en español (sin tildes en el código existente).
- Los comentarios explican el _porqué_ y suelen referenciar el archivo del backend que justifica el comportamiento.
