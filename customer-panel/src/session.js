/**
 * Persistencia de la sesión del cliente en localStorage.
 *
 * Se elige localStorage (no sessionStorage) para que la sesión sobreviva al
 * cierre de la pestaña: es lo que el usuario espera de un portal ("recuérdame").
 * Trade-off conocido: un token en localStorage es accesible por JS, así que es
 * vulnerable a XSS. En un backend propio lo ideal sería una cookie httpOnly;
 * como G2 es un servicio de tokens Bearer para todo el ecosistema, aquí
 * guardamos el token igual que el resto de los consumidores.
 */
const ACCESS_KEY = 'g2_customer_access';
const REFRESH_KEY = 'g2_customer_refresh';
const USER_KEY = 'g2_customer_user';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

/** Guarda la sesión completa tras login/registro. */
export function saveSession({ access_token, refresh_token, user }) {
  if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Actualiza solo los tokens (tras un /auth/refresh). */
export function saveTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
}

/** Actualiza solo el perfil cacheado (tras editar el nombre, por ejemplo). */
export function saveUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
