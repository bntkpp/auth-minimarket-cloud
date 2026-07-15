/**
 * Cliente de la API de Identidad (G2) para el portal de clientes.
 * Consume DIRECTAMENTE el servicio de G2. La URL base se configura con
 * VITE_API_URL (por defecto, el deploy de Render).
 */
import { getAccessToken } from './session.js';

const BASE = (import.meta.env.VITE_API_URL || 'https://auth-minimarket-cloud.onrender.com').replace(/\/$/, '');

/**
 * Petición base. Adjunta el Bearer token si `auth` es true y normaliza los
 * errores del contrato de G2 ({ timestamp, status, code, message, correlationId }).
 * Devuelve { data, headers } para los pocos casos que necesitan leer headers
 * (p. ej. X-Mock-Reset-Token en el flujo de recuperación).
 */
async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAccessToken();
    if (!token) throw new Error('No hay sesión activa.');
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      /* respuesta sin cuerpo JSON */
    }
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Error ${res.status}`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return { data, headers: res.headers };
}

export const api = {
  baseUrl: BASE,

  // --- Auth ---
  register: (email, password, full_name) =>
    request('/auth/register', { method: 'POST', body: { email, password, full_name } }).then((r) => r.data),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }).then((r) => r.data),

  refresh: (refresh_token) =>
    request('/auth/refresh', { method: 'POST', body: { refresh_token } }).then((r) => r.data),

  logout: (refresh_token) =>
    request('/auth/logout', { method: 'POST', auth: true, body: { refresh_token } }).then((r) => r.data),

  validate: () => request('/auth/validate', { auth: true }).then((r) => r.data),

  changePassword: (current_password, new_password) =>
    request('/auth/change-password', {
      method: 'POST',
      auth: true,
      body: { current_password, new_password },
    }).then((r) => r.data),

  // Nota: la recuperación de contraseña ("olvidé mi contraseña") NO pasa por G2.
  // Usa el flujo nativo de Supabase (enviar correo + fijar nueva contraseña),
  // implementado en src/supabase.js y los componentes Forgot/Reset.

  // --- Perfil ---
  me: () => request('/users/me', { auth: true }).then((r) => r.data),

  updateName: (full_name) =>
    request('/users/me', { method: 'PATCH', auth: true, body: { full_name } }).then((r) => r.data),
};
