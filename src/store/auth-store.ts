import { create } from 'zustand';

import { registerUnauthorizedHandler, setAuthToken, toApiError } from '@/lib/api';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/token-storage';
import { fetchMe, login as loginRequest } from '@/services/auth';
import type { AuthStatus, LoginPayload, User } from '@/types';

type AuthState = {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  /** `true` mientras vuela el `POST /auth/login`. */
  isSubmitting: boolean;
  /** Ultimo fallo, ya legible. Las pantallas lo muestran tal cual. */
  error: string | null;

  /** Lee el token guardado y lo valida contra `/auth/me`. Llamar una vez al arrancar. */
  bootstrap: () => Promise<void>;
  /** `true` si la sesion quedo abierta. El mensaje de fallo queda en `error`. */
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  status: 'hydrating',
  isSubmitting: false,
  error: null,

  bootstrap: async () => {
    const token = await getStoredToken();

    if (!token) {
      set({ status: 'unauthenticated', user: null, token: null });
      return;
    }

    setAuthToken(token);
    try {
      const user = await fetchMe();
      set({ user, token, status: 'authenticated', error: null });
    } catch (error) {
      // Tambien con la API caida: sin poder validar el token no abrimos la
      // sesion, pero dejamos el motivo para que el login lo explique.
      const { message } = toApiError(error);
      setAuthToken(null);
      await clearStoredToken();
      set({ user: null, token: null, status: 'unauthenticated', error: message });
    }
  },

  login: async (payload) => {
    set({ isSubmitting: true, error: null });

    try {
      const response = await loginRequest(payload);
      const token = response.access_token;

      if (!token) {
        // El 2xx de `AuthController.login` siempre trae token; si no, algo cambio.
        set({ isSubmitting: false, error: response.detail || 'La API no devolvio un token' });
        return false;
      }

      setAuthToken(token);
      const user = await fetchMe();
      await setStoredToken(token);

      set({ user, token, status: 'authenticated', isSubmitting: false, error: null });
      return true;
    } catch (error) {
      const { message } = toApiError(error);
      setAuthToken(null);
      set({ user: null, token: null, status: 'unauthenticated', isSubmitting: false, error: message });
      return false;
    }
  },

  logout: async () => {
    // El backend no tiene endpoint de logout: el JWT es stateless y caduca en 1 dia.
    setAuthToken(null);
    await clearStoredToken();
    set({ user: null, token: null, status: 'unauthenticated', isSubmitting: false, error: null });
  },

  clearError: () => set({ error: null }),
}));

// Un 401 fuera de `/auth/login` significa token invalido o caducado: cerramos
// sesion para que el guard del layout mande al login en el siguiente render.
registerUnauthorizedHandler(() => {
  if (useAuthStore.getState().status !== 'unauthenticated') {
    void useAuthStore.getState().logout();
  }
});