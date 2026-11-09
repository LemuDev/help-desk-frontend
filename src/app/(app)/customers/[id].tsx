/**
 * Detalle de un cliente (`/customers/{id}`): el mismo que el de un usuario
 * (`GET /users/{id}`), con su propia ruta para que atras vuelva a Clientes.
 * Protegida por `user:read` en `SCREEN_PERMISSIONS`.
 */
export { default } from "../users/[id]";
