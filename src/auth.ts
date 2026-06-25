import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  config, fallo, emitirToken, autenticar, aPerfil,
} from './helpers.js';
import * as db from './store.js';
import type { Usuario } from './store.js';

const router = Router();

// --- Validaciones simples (type guards) -------------------------------------
function esTexto(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
function esEmail(v: unknown): v is string {
  return esTexto(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Arma la respuesta AuthResponse (user + tokens) del contrato.
function authResponse(usuario: Usuario) {
  return {
    user: aPerfil(usuario),
    access_token: emitirToken(usuario),
    refresh_token: db.crearRefreshToken(usuario.user_id),
    token_type: 'bearer',
    expires_in: config.accessTtl,
  };
}

// POST /auth/register --------------------------------------------------------
router.post('/register', (req: Request, res: Response) => {
  const { email, password, full_name } = req.body ?? {};
  if (!esEmail(email) || !esTexto(full_name) || typeof password !== 'string') {
    throw fallo.badRequest("Faltan campos o 'email' no es válido.");
  }
  if (password.length < 8) throw fallo.weakPassword();
  if (db.buscarPorEmail(email)) throw fallo.conflict();

  const usuario = db.crearUsuario({ email, password, full_name });
  res.status(201).json(authResponse(usuario));
});

// POST /auth/login -----------------------------------------------------------
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!esEmail(email) || typeof password !== 'string') {
    throw fallo.badRequest('Falta email o password.');
  }
  const usuario = db.buscarPorEmail(email);
  if (!usuario || usuario.password !== password) {
    throw fallo.invalidCredentials('Email o contraseña incorrectos.');
  }
  if (usuario.status !== 'active') {
    throw fallo.unauthorized('La cuenta está deshabilitada.');
  }
  res.status(200).json(authResponse(usuario));
});

// POST /auth/refresh ---------------------------------------------------------
router.post('/refresh', (req: Request, res: Response) => {
  const { refresh_token } = req.body ?? {};
  if (!esTexto(refresh_token)) throw fallo.badRequest('Falta refresh_token.');

  const userId = db.usarRefreshToken(refresh_token);
  const usuario = userId ? db.buscarPorId(userId) : null;
  if (!usuario || usuario.status !== 'active') {
    throw fallo.unauthorized('Refresh token inválido o expirado.');
  }
  res.status(200).json({
    access_token: emitirToken(usuario),
    refresh_token: db.crearRefreshToken(usuario.user_id), // rotación
    token_type: 'bearer',
    expires_in: config.accessTtl,
  });
});

// POST /auth/change-password (autenticado) ----------------------------------
router.post('/change-password', autenticar, (req: Request, res: Response) => {
  const usuario = req.usuario!;
  const { current_password, new_password } = req.body ?? {};
  if (typeof current_password !== 'string' || typeof new_password !== 'string') {
    throw fallo.badRequest('Faltan current_password o new_password.');
  }
  if (usuario.password !== current_password) {
    throw fallo.invalidCredentials('La contraseña actual es incorrecta.');
  }
  if (new_password.length < 8) throw fallo.weakPassword();

  db.actualizarUsuario(usuario, { password: new_password });
  db.revocarSesiones(usuario.user_id); // invalida las demás sesiones
  res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
});

// POST /auth/forgot-password -------------------------------------------------
router.post('/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  if (!esEmail(email)) throw fallo.badRequest("'email' no es válido.");

  // Por seguridad respondemos 200 aunque el email no exista.
  const usuario = db.buscarPorEmail(email);
  if (usuario && !config.isProd) {
    // El mock no envía correos: dejamos el reset_token en un header (solo fuera
    // de producción) para poder probar /auth/reset-password.
    const token = db.crearResetToken(usuario.user_id);
    console.log(`[mock] reset_token: ${token}`);
    res.setHeader('X-Mock-Reset-Token', token);
  }
  res.status(200).json({
    message: 'Si el email está registrado, recibirás un correo con instrucciones.',
  });
});

// POST /auth/reset-password --------------------------------------------------
router.post('/reset-password', (req: Request, res: Response) => {
  const { reset_token, new_password } = req.body ?? {};
  if (!esTexto(reset_token) || typeof new_password !== 'string') {
    throw fallo.badRequest('Faltan reset_token o new_password.');
  }
  if (new_password.length < 8) throw fallo.weakPassword();

  const userId = db.usarResetToken(reset_token);
  if (!userId) throw fallo.invalidResetToken();

  const usuario = db.buscarPorId(userId)!;
  db.actualizarUsuario(usuario, { password: new_password });
  db.revocarSesiones(userId);
  res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
});

// POST /auth/logout (autenticado) -------------------------------------------
router.post('/logout', autenticar, (req: Request, res: Response) => {
  const { refresh_token } = req.body ?? {};
  if (refresh_token) db.revocarRefreshToken(refresh_token);
  else db.revocarSesiones(req.usuario!.user_id);
  res.status(204).send();
});

// GET /auth/validate (autenticado) — endpoint para otros grupos -------------
router.get('/validate', autenticar, (req: Request, res: Response) => {
  const usuario = req.usuario!;
  // El token ya fue verificado (401 si era inválido/expirado).
  // Cuenta deshabilitada -> 403.
  if (usuario.status !== 'active') throw fallo.forbidden('La cuenta está deshabilitada.');

  const decoded = jwt.decode(req.token!) as jwt.JwtPayload;
  const exp = decoded.exp ?? 0; // epoch en segundos
  res.status(200).json({
    valid: true,
    user_id: usuario.user_id,
    business_user_id: usuario.business_user_id ?? null,
    email: usuario.email,
    role: usuario.role,
    status: usuario.status,
    expires_at: new Date(exp * 1000).toISOString(),
  });
});

export default router;
