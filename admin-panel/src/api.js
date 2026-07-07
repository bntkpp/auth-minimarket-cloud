/**
 * Cliente de la API de Identidad (G2). El panel consume DIRECTAMENTE el servicio
 * de G2 (no pasa por el BFF de G1, que no expone gestión de usuarios).
 * La URL base se configura con VITE_API_URL.
 */
const BASE = (import.meta.env.VITE_API_URL || 'https://auth-minimarket-cloud.onrender.com').replace(/\/$/, '');
const TOKEN_KEY = 'g2_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo */
  }

  if (!res.ok) {
    // El error de G2 tiene forma { timestamp, status, code, message, correlationId }
    const err = new Error(data?.message || `Error ${res.status}`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export const api = {
  baseUrl: BASE,

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  me: () => request('/users/me'),

  listUsers: ({ role, status, page = 1, limit = 20 } = {}) => {
    const qs = new URLSearchParams();
    if (role) qs.set('role', role);
    if (status) qs.set('status', status);
    qs.set('page', String(page));
    qs.set('limit', String(limit));
    return request(`/users?${qs.toString()}`);
  },

  createUser: ({ email, password, full_name }) =>
    request('/auth/register', { method: 'POST', body: { email, password, full_name } }),

  updateName: (id, full_name) =>
    request(`/users/${id}`, { method: 'PATCH', body: { full_name } }),

  changeRole: (id, role) =>
    request(`/users/${id}/role`, { method: 'PATCH', body: { role } }),

  changeStatus: (id, status) =>
    request(`/users/${id}/status`, { method: 'PATCH', body: { status } }),

  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};
