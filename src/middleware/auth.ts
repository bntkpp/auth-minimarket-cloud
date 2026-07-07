import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { fallo } from '../utils/errors.js';
import { buscarPorId } from '../repositories/store.js';
import '../utils/types.js'; // carga la extensión de tipos de Express.Request

/**
 * Middlewares de autenticación y autorización.
 * Verifica el header "Authorization: Bearer <token>" y deja el usuario en req.
 */
export async function autenticar(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(fallo.unauthorized('Falta el token (Bearer).'));
  }
  let datos: jwt.JwtPayload;
  try {
    datos = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  } catch (e) {
    const msg = (e as Error).name === 'TokenExpiredError' ? 'El token ha expirado.' : 'Token inválido.';
    return next(fallo.unauthorized(msg));
  }
  const usuario = await buscarPorId(String(datos.sub));
  if (!usuario) return next(fallo.unauthorized('El usuario ya no existe.'));
  req.usuario = usuario;
  req.token = token;
  next();
}

// Bloquea si la cuenta está deshabilitada (403).
export function soloActivos(req: Request, _res: Response, next: NextFunction): void {
  if (req.usuario!.status !== 'active') return next(fallo.forbidden('La cuenta está deshabilitada.'));
  next();
}

// Bloquea si no es admin (403).
export function soloAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.usuario!.role !== 'admin') return next(fallo.forbidden('Se requiere rol admin.'));
  next();
}
