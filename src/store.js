import crypto from 'node:crypto';

/**
 * "Base de datos" en memoria del mock. Guarda los usuarios, las sesiones
 * (refresh tokens) y los tokens de recuperación. Al ser un mock, las
 * contraseñas se guardan en texto plano: NO hagas esto en producción
 * (ahí Supabase Auth se encarga del hashing).
 */

const ahora = () => new Date().toISOString();

// --- Datos en memoria -------------------------------------------------------
export const usuarios = [
  {
    user_id: '3d9a1f44-1b2a-4c3d-8e5f-aabbccddeeff',
    business_user_id: 'USR-01',
    email: 'juan@correo.cl',
    full_name: 'Juan Pérez',
    role: 'customer',
    status: 'active',
    email_verified: true,
    password: 'MiClave123',
    created_at: '2026-06-01T09:30:00Z',
    updated_at: '2026-06-10T18:45:00Z',
  },
  {
    user_id: '7a2b3c4d-5e6f-7890-abcd-ef1234567890',
    business_user_id: 'USR-02',
    email: 'maria@correo.cl',
    full_name: 'María González',
    role: 'admin',
    status: 'active',
    email_verified: true,
    password: 'AdminClave123',
    created_at: '2026-05-20T08:00:00Z',
    updated_at: '2026-06-05T11:15:00Z',
  },
];

const refreshTokens = new Map(); // refresh_token -> user_id
const resetTokens = new Map();   // reset_token   -> user_id
let businessSeq = 2;             // ya van USR-01 y USR-02

// --- Usuarios ---------------------------------------------------------------
export function buscarPorEmail(email) {
  const e = String(email || '').toLowerCase();
  return usuarios.find((u) => u.email.toLowerCase() === e) || null;
}

export function buscarPorId(userId) {
  return usuarios.find((u) => u.user_id === userId) || null;
}

export function crearUsuario({ email, password, full_name }) {
  businessSeq += 1;
  const u = {
    user_id: crypto.randomUUID(),
    business_user_id: `USR-${String(businessSeq).padStart(2, '0')}`,
    email,
    full_name,
    role: 'customer',
    status: 'active',
    email_verified: false,
    password,
    created_at: ahora(),
    updated_at: ahora(),
  };
  usuarios.push(u);
  return u;
}

export function actualizarUsuario(usuario, cambios) {
  Object.assign(usuario, cambios, { updated_at: ahora() });
  return usuario;
}

export function eliminarUsuario(userId) {
  const i = usuarios.findIndex((u) => u.user_id === userId);
  if (i === -1) return false;
  usuarios.splice(i, 1);
  return true;
}

// --- Sesiones (refresh tokens) ---------------------------------------------
export function crearRefreshToken(userId) {
  const token = 'mock_' + crypto.randomBytes(16).toString('hex');
  refreshTokens.set(token, userId);
  return token;
}

export function usarRefreshToken(token) {
  const userId = refreshTokens.get(token);
  if (!userId) return null;
  refreshTokens.delete(token); // rotación: el viejo deja de servir
  return userId;
}

export function revocarRefreshToken(token) {
  refreshTokens.delete(token);
}

export function revocarSesiones(userId) {
  for (const [t, uid] of refreshTokens.entries()) {
    if (uid === userId) refreshTokens.delete(t);
  }
}

// --- Tokens de recuperación de contraseña ----------------------------------
export function crearResetToken(userId) {
  const token = 'rt_' + crypto.randomBytes(12).toString('hex');
  resetTokens.set(token, userId);
  return token;
}

export function usarResetToken(token) {
  const userId = resetTokens.get(token);
  if (!userId) return null;
  resetTokens.delete(token);
  return userId;
}
