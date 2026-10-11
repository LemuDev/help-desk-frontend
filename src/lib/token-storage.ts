import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'helpdesk.access_token';

/**
 * Persistencia del JWT.
 *
 * `expo-secure-store` no existe en web (usa Keychain/Keystore), asi que ahi se
 * cae a `localStorage`. Todo va envuelto en try/catch porque en el prerender de
 * `web.output: "static"` no hay `window`, y en modo incognito el acceso lanza.
 */

async function setWebItem(value: string | null) {
  try {
    if (value === null) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, value);
  } catch {
    // Sin almacenamiento la sesion solo vive en memoria: no es fatal.
  }
}

export async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  if (Platform.OS === 'web') return setWebItem(token);
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // Igual que en web: seguimos con el token en memoria.
  }
}

export async function clearStoredToken(): Promise<void> {
  if (Platform.OS === 'web') return setWebItem(null);
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Nada que limpiar.
  }
}