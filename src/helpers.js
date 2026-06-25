import jwt from 'jsonwebtoken';
import { buscarPorId } from './store.js';

/**
 * Utilidades comunes: configuración, errores con el formato del contrato,
 * tokens JWT y middlewares de autenticación. Todo en un solo archivo para
 * que sea fácil de leer.
 */

// --- Configuración (se puede sobreescribir con variables de entorno) --------
export const config = {
  port: Number(process.env.PORT) || 8080,
  jwtSecret: process.env.JWT_SECRET || 'secreto-de-prueba',
  // Vida del access token en segundos. Ponlo bajo (ej. 10) para demostrar la
  // expiración del token en /auth/validate.
  accessTtl: Number(process.env.ACCESS_TOKEN_TTL) || 3600,
  isProd: process.env.NODE_ENV === 'production',
};

// --- Errores con el formato unificado del ecosistema ------------------------
// { timestamp, status, code, message, correlationId }
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Atajos para lanzar errores. Ej: throw fallo.conflict()
export const fallo = {
  badRequest: (m = 'Payload inválido.') => new ApiError(400, 'BAD_REQUEST', m),
  unauthorized: (m = 'Token inválido o expirado.') => new ApiError(401, 'UNAUTHORIZED', m),
  invalidCredentials: (m = 'Credenciales incorrectas.') => new ApiError(401, 'INVALID_CREDENTIALS', m),
  invalidResetToken: (m = 'El token de recuperación es inválido o expiró.') => new ApiError(401, 'INVALID_RESET_TOKEN', m),
  forbidden: (m = 'No tienes permisos para esta acción.') => new ApiError(403, 'FORBIDDEN', m),
  notFound: (m = 'Recurso no encontrado.') => new ApiError(404, 'NOT_FOUND', m),
  conflict: (m = 'El email ya está registrado.') => new ApiError(409, 'EMAIL_ALREADY_EXISTS', m),
  weakPassword: (m = 'La contraseña debe tener al menos 8 caracteres.') => new ApiError(422, 'WEAK_PASSWORD', m),
};

// Middleware final que convierte cualquier error al formato del contrato.
export function manejadorErrores(err, req, res, _next) {
  const e = err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  if (!(err instanceof ApiError)) console.error(err);
  res.status(e.status).json({
    timestamp: new Date().toISOString(),
    status: e.status,
    code: e.code,
    message: e.message,
    correlationId: req.correlationId || null,
  });
}

// --- Tokens (JWT) -----------------------------------------------------------
export function emitirToken(usuario) {
  return jwt.sign(
    {
      sub: usuario.user_id,
      email: usuario.email,
      role: usuario.role,
      status: usuario.status,
      business_user_id: usuario.business_user_id,
    },
    config.jwtSecret,
    { expiresIn: config.accessTtl },
  );
}

// --- Middlewares de autenticación ------------------------------------------
// Verifica el header "Authorization: Bearer <token>" y deja el usuario en req.
export function autenticar(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(fallo.unauthorized('Falta el token (Bearer).'));
  }
  let datos;
  try {
    datos = jwt.verify(token, config.jwtSecret);
  } catch (e) {
    const msg = e.name === 'TokenExpiredError' ? 'El token ha expirado.' : 'Token inválido.';
    return next(fallo.unauthorized(msg));
  }
  const usuario = buscarPorId(datos.sub);
  if (!usuario) return next(fallo.unauthorized('El usuario ya no existe.'));
  req.usuario = usuario;
  req.token = token;
  next();
}

// Bloquea si la cuenta está deshabilitada (403).
export function soloActivos(req, _res, next) {
  if (req.usuario.status !== 'active') return next(fallo.forbidden('La cuenta está deshabilitada.'));
  next();
}

// Bloquea si no es admin (403).
export function soloAdmin(req, _res, next) {
  if (req.usuario.role !== 'admin') return next(fallo.forbidden('Se requiere rol admin.'));
  next();
}

// --- Salida: arma el objeto UserProfile del contrato (sin la contraseña) ----
export function aPerfil(u) {
  return {
    user_id: u.user_id,
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
