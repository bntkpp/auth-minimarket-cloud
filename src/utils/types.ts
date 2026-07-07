import type { Usuario } from '../models/user.js';

/**
 * Extiende el tipo Request de Express para incluir los datos que agregan
 * nuestros middlewares (usuario autenticado, token, correlationId).
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: Usuario;
      token?: string;
      correlationId?: string | null;
    }
  }
}

export {};
