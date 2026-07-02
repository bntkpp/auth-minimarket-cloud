import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  config, fallo, emitirToken, autenticar, aPerfil,
} from './helpers.js';
import * as db from './store.js';
import type { Usuario } from './store.js';

const router = Router();

function esTexto(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
function esEmail(v: unknown): v is string {
  return esTexto(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function authResponse(usuario: Usuario) {
  return {
    user: aPerfil(usuario),
    access_token: emitirToken(usuario),
    refresh_token: db.crearRefreshToken(usuario.id),
    token_type: 'bearer',
    expires_in: config.accessTtl,
  };
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body ?? {};
  if (!esEmail(email) || !esTexto(full_name) || typeof password !== 'string') {
    throw fallo.badRequest("Faltan campos o 'email' no es válido.");
  }
  if (password.length < 8) throw fallo.weakPassword();

  const existente = await db.buscarPorEmail(email);
  if (existente) throw fallo.conflict();

  const usuario = await db.crearUsuario({ email, password, full_name });
  res.status(201).json(await authResponse(usuario));
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!esEmail(email) || typeof password !== 'string') {
    throw fallo.badRequest('Falta email o password.');
  }

  const usuario = await db.validarCredenciales(email, password);
  if (!usuario) throw fallo.invalidCredentials('Email o contraseña incorrectos.');
  if (usuario.status !== 'active') throw fallo.unauthorized('La cuenta está deshabilitada.');

  res.status(200).json(await authResponse(usuario));
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refresh_token } = req.body ?? {};
  if (!esTexto(refresh_token)) throw fallo.badRequest('Falta refresh_token.');

  const userId = db.usarRefreshToken(refresh_token);
  const usuario = userId ? await db.buscarPorId(userId) : null;
  if (!usuario || usuario.status !== 'active') {
    throw fallo.unauthorized('Refresh token inválido o expirado.');
  }
  res.status(200).json({
    access_token: emitirToken(usuario),
    refresh_token: db.crearRefreshToken(usuario.id),
    token_type: 'bearer',
    expires_in: config.accessTtl,
  });
});

// POST /auth/change-password (autenticado)
router.post('/change-password', autenticar, async (req: Request, res: Response) => {
  const usuario = req.usuario!;
  const { current_password, new_password } = req.body ?? {};
  if (typeof current_password !== 'string' || typeof new_password !== 'string') {
    throw fallo.badRequest('Faltan current_password o new_password.');
  }
  if (new_password.length < 8) throw fallo.weakPassword();

  // Validamos credencial actual contra Supabase
  const valido = await db.validarCredenciales(usuario.email, current_password);
  if (!valido) throw fallo.invalidCredentials('La contraseña actual es incorrecta.');

  await db.actualizarPasswordAuth(usuario.id, new_password);
  db.revocarSesiones(usuario.id);
  res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  if (!esEmail(email)) throw fallo.badRequest("'email' no es válido.");

  const usuario = await db.buscarPorEmail(email);
  if (usuario && !config.isProd) {
    const token = db.crearResetToken(usuario.id);
    console.log(`[mock] reset_token: ${token}`);
    res.setHeader('X-Mock-Reset-Token', token);
  }
  res.status(200).json({
    message: 'Si el email está registrado, recibirás un correo con instrucciones.',
  });
});

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  const { reset_token, new_password } = req.body ?? {};
  if (!esTexto(reset_token) || typeof new_password !== 'string') {
    throw fallo.badRequest('Faltan reset_token o new_password.');
  }
  if (new_password.length < 8) throw fallo.weakPassword();

  const userId = db.usarResetToken(reset_token);
  if (!userId) throw fallo.invalidResetToken();

  await db.actualizarPasswordAuth(userId, new_password);
  db.revocarSesiones(userId);
  res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
});

// POST /auth/logout (autenticado)
router.post('/logout', autenticar, (req: Request, res: Response) => {
  const { refresh_token } = req.body ?? {};
  if (refresh_token) db.revocarRefreshToken(refresh_token);
  else db.revocarSesiones(req.usuario!.id);
  res.status(204).send();
});

// GET /auth/validate (autenticado) — endpoint para otros grupos
router.get('/validate', autenticar, (req: Request, res: Response) => {
  const usuario = req.usuario!;
  if (usuario.status !== 'active') throw fallo.forbidden('La cuenta está deshabilitada.');

  const decoded = jwt.decode(req.token!) as jwt.JwtPayload;
  const exp = decoded.exp ?? 0;
  res.status(200).json({
    valid: true,
    user_id: usuario.id,
    business_user_id: usuario.business_user_id ?? null,
    email: usuario.email,
    role: usuario.role,
    status: usuario.status,
    expires_at: new Date(exp * 1000).toISOString(),
  });
})

export default router;
