import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import type { Usuario } from '../models/user.js';

/**
 * Emisión de access tokens (JWT). Emula a Supabase Auth: el UUID interno viaja
 * en el claim `sub`.
 */
export function emitirToken(usuario: Usuario): string {
  return jwt.sign(
    {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      status: usuario.status,
      business_user_id: usuario.business_user_id,
    },
    config.jwtSecret,
    { expiresIn: config.accessTtl },
  );
}
