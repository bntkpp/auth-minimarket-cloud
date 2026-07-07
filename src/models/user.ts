/**
 * Modelo de dominio: Usuario. La vista pública `UserProfile` es lo que devuelve
 * el contrato (sin datos sensibles).
 */

export type Role = 'customer' | 'admin';
export type Status = 'active' | 'disabled';

export interface Usuario {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: Status;
  business_user_id: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  business_user_id: string | null;
  email: string;
  full_name: string;
  role: Role;
  status: Status;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

/** Arma el objeto UserProfile del contrato a partir del Usuario interno. */
export function aPerfil(u: Usuario): UserProfile {
  return {
    user_id: u.id,
    business_user_id: u.business_user_id ?? null,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    status: u.status,
    email_verified: u.email_verified,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}
