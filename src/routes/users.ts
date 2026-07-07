import { Router, type Request, type Response } from 'express';
import { fallo } from '../utils/errors.js';
import { soloActivos, soloAdmin, autenticar } from '../middleware/auth.js';
import { aPerfil, type Usuario } from '../models/user.js';
import * as db from '../repositories/store.js';

const router = Router();

router.use(autenticar, soloActivos);

async function obtenerUsuario(req: Request): Promise<Usuario> {
  const usuario = await db.buscarPorId(req.params.user_id);
  if (!usuario) throw fallo.notFound('Usuario no encontrado.');
  return usuario;
}

// GET /users/me
router.get('/me', (req: Request, res: Response) => {
  res.status(200).json(aPerfil(req.usuario!));
});

// PATCH /users/me
router.patch('/me', async (req: Request, res: Response) => {
  const { full_name } = req.body ?? {};
  if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim() === '')) {
    throw fallo.badRequest("'full_name' no puede estar vacío.");
  }
  if (full_name !== undefined) {
    await db.actualizarUsuario(req.usuario!.id, { full_name });
  }
  res.status(200).json(aPerfil(req.usuario!));
});

// GET /users?role=&status=&page=&limit=
router.get('/', soloAdmin, async (req: Request, res: Response) => {
  let lista = await db.listarUsuarios();
  if (req.query.role) lista = lista.filter((u) => u.role === req.query.role);
  if (req.query.status) lista = lista.filter((u) => u.status === req.query.status);

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const inicio = (page - 1) * limit;
  const pagina = lista.slice(inicio, inicio + limit);

  res.status(200).json({
    total: lista.length,
    page,
    limit,
    users: pagina.map(aPerfil),
  });
});

// GET /users/:user_id
router.get('/:user_id', soloAdmin, async (req: Request, res: Response) => {
  res.status(200).json(aPerfil(await obtenerUsuario(req)));
});

// PATCH /users/:user_id
router.patch('/:user_id', soloAdmin, async (req: Request, res: Response) => {
  const usuario = await obtenerUsuario(req);
  const { full_name } = req.body ?? {};
  if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim() === '')) {
    throw fallo.badRequest("'full_name' no puede estar vacío.");
  }
  if (full_name !== undefined) {
    await db.actualizarUsuario(usuario.id, { full_name });
  }
  res.status(200).json(aPerfil(usuario));
});

// DELETE /users/:user_id
router.delete('/:user_id', soloAdmin, async (req: Request, res: Response) => {
  await obtenerUsuario(req);
  await db.eliminarUsuario(req.params.user_id);
  res.status(204).send();
});

// PATCH /users/:user_id/role
router.patch('/:user_id/role', soloAdmin, async (req: Request, res: Response) => {
  const usuario = await obtenerUsuario(req);
  const { role } = req.body ?? {};
  if (role !== 'customer' && role !== 'admin') {
    throw fallo.badRequest("'role' debe ser 'customer' o 'admin'.");
  }
  await db.actualizarUsuario(usuario.id, { role });
  res.status(200).json(aPerfil(usuario));
});

// PATCH /users/:user_id/status
router.patch('/:user_id/status', soloAdmin, async (req: Request, res: Response) => {
  const usuario = await obtenerUsuario(req);
  const { status } = req.body ?? {};
  if (status !== 'active' && status !== 'disabled') {
    throw fallo.badRequest("'status' debe ser 'active' o 'disabled'.");
  }
  await db.actualizarUsuario(usuario.id, { status });
  if (status === 'disabled') db.revocarSesiones(usuario.id);
  res.status(200).json(aPerfil(usuario));
});

export default router;
