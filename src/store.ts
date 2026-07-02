import crypto from 'node:crypto';
import { supabase } from './config/supabase.js';

export type Role = 'customer' | 'admin';
export type Status = 'active' | 'disabled';

export interface Usuario {
  user_id: string;
  business_user_id: string;
  email: string;
  full_name: string;
  role: Role;
  status: Status;
  email_verified: boolean;
  password: string;
  created_at: string;
  updated_at: string;
}

const ahora = (): string => new Date().toISOString();

// --- Sesiones en memoria (refresh tokens) -----------------------------------
const refreshTokens = new Map<string, string>(); // refresh_token -> user_id
const resetTokens = new Map<string, string>();   // reset_token   -> user_id

// --- Usuarios (Supabase) ----------------------------------------------------
export async function buscarPorEmail(email: string): Promise<Usuario | null> {
  const e = String(email || '').toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', e)
    .single();

  if (error || !data) return null;
  return data as Usuario;
}

export async function buscarPorId(userId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as Usuario;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase.from('users').select('*');
  if (error || !data) return [];
  return data as Usuario[];
}

export interface NuevoUsuario {
  email: string;
  password: string;
  full_name: string;
}

export async function crearUsuario({ email, password, full_name }: NuevoUsuario): Promise<Usuario> {
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const seq = (count ?? 0) + 1;

  const u: Omit<Usuario, 'user_id'> & { user_id?: string } = {
    user_id: crypto.randomUUID(),
    business_user_id: `USR-${String(seq).padStart(2, '0')}`,
    email,
    full_name,
    role: 'customer',
    status: 'active',
    email_verified: false,
    password,
    created_at: ahora(),
    updated_at: ahora(),
  };

  const { data, error } = await supabase.from('users').insert(u).select().single();
  if (error || !data) {
    throw new Error(`Error al crear usuario: ${error?.message ?? 'desconocido'}`);
  }
  return data as Usuario;
}

export async function actualizarUsuario(
  userId: string,
  cambios: Partial<Omit<Usuario, 'user_id' | 'created_at'>>
): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...cambios, updated_at: ahora() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) return null;
  return data as Usuario;
}

export async function eliminarUsuario(userId: string): Promise<boolean> {
  const { error } = await supabase.from('users').delete().eq('user_id', userId);
  return !error;
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
