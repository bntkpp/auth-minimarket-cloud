import crypto from 'node:crypto';
import { supabase } from '../config/supabase.js';
import type { User } from '@supabase/supabase-js';
import type { Usuario, Role, Status } from '../models/user.js';

/**
 * Acceso a datos: usuarios en Supabase Auth + sesiones (refresh/reset tokens)
 * en memoria. El resto de la app usa estas funciones sin saber que por debajo
 * es Supabase.
 */

// --- Mapeo entre Supabase User y nuestro modelo ----------------------------
function mapUser(u: User): Usuario {
  return {
    id: u.id,
    email: u.email ?? '',
    full_name: (u.user_metadata?.full_name as string) ?? '',
    role: (u.user_metadata?.role as Role) ?? 'customer',
    status: (u.user_metadata?.status as Status) ?? 'active',
    business_user_id: (u.user_metadata?.business_user_id as string) ?? '',
    email_verified: u.email_confirmed_at != null,
    created_at: u.created_at ?? '',
    updated_at: u.updated_at ?? '',
  };
}

// --- Sesiones en memoria (refresh / reset tokens) ---------------------------
const refreshTokens = new Map<string, string>();
const resetTokens = new Map<string, string>();

// --- Usuarios (Supabase Auth) -----------------------------------------------
export async function buscarPorEmail(email: string): Promise<Usuario | null> {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error || !data) return null;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user ? mapUser(user) : null;
}

export async function buscarPorId(userId: string): Promise<Usuario | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  return mapUser(data.user);
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error || !data) return [];
  return data.users.map(mapUser);
}

export interface NuevoUsuario {
  email: string;
  password: string;
  full_name: string;
}

export async function crearUsuario({ email, password, full_name }: NuevoUsuario): Promise<Usuario> {
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  // Si no existe tabla profiles, usamos conteo simple
  let seq = 1;
  try {
    const { data: all } = await supabase.auth.admin.listUsers();
    seq = (all?.users.length ?? 0) + 1;
  } catch { /* ignora */ }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // para demo local sin verificar correo
    user_metadata: {
      full_name,
      role: 'customer',
      status: 'active',
      business_user_id: `USR-${String(seq).padStart(2, '0')}`,
    },
  });

  if (error || !data?.user) {
    throw new Error(error?.message ?? 'Error creando usuario en Supabase Auth');
  }
  return mapUser(data.user);
}

export async function actualizarUsuario(
  userId: string,
  cambios: Partial<Pick<Usuario, 'full_name' | 'role' | 'status'>>
): Promise<Usuario | null> {
  const metadata: Record<string, unknown> = {};
  if (cambios.full_name !== undefined) metadata.full_name = cambios.full_name;
  if (cambios.role !== undefined) metadata.role = cambios.role;
  if (cambios.status !== undefined) metadata.status = cambios.status;

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });
  if (error || !data?.user) return null;
  return mapUser(data.user);
}

export async function eliminarUsuario(userId: string): Promise<boolean> {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  return !error;
}

// --- Login / Password (delegado a Supabase Auth) ---------------------------
export async function validarCredenciales(email: string, password: string): Promise<Usuario | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  return mapUser(data.user);
}

export async function actualizarPasswordAuth(userId: string, newPassword: string): Promise<void> {
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Error(error.message);
}

// --- Sesiones (refresh tokens) ---------------------------------------------
export function crearRefreshToken(userId: string): string {
  const token = 'mock_' + crypto.randomBytes(16).toString('hex');
  refreshTokens.set(token, userId);
  return token;
}

export function usarRefreshToken(token: string): string | null {
  const userId = refreshTokens.get(token);
  if (!userId) return null;
  refreshTokens.delete(token);
  return userId;
}

export function revocarRefreshToken(token: string): void {
  refreshTokens.delete(token);
}

export function revocarSesiones(userId: string): void {
  for (const [t, uid] of refreshTokens.entries()) {
    if (uid === userId) refreshTokens.delete(t);
  }
}

// --- Tokens de recuperación de contraseña ----------------------------------
export function crearResetToken(userId: string): string {
  const token = 'rt_' + crypto.randomBytes(12).toString('hex');
  resetTokens.set(token, userId);
  return token;
}

export function usarResetToken(token: string): string | null {
  const userId = resetTokens.get(token);
  if (!userId) return null;
  resetTokens.delete(token);
  return userId;
}
