import type { Request, Response, NextFunction } from 'express';

/**
 * Errores con el formato unificado del ecosistema:
 *   { timestamp, status, code, message, correlationId }
 */
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
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
export function manejadorErrores(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const e = err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  if (!(err instanceof ApiError)) console.error(err);
  res.status(e.status).json({
    timestamp: new Date().toISOString(),
    status: e.status,
    code: e.code,
    message: e.message,
    correlationId: req.correlationId ?? null,
  });
}
