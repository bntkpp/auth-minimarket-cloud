import { Router, type Request, type Response } from 'express';
import { fallo, soloActivos, soloAdmin, autenticar, aPerfil } from './helpers.js';
import * as db from './store.js';
import type { Usuario } from './store.js';

const router = Router();

// Todas las rutas de /users requieren sesión activa.
router.use(autenticar, soloActivos);

// Busca un usuario por el :user_id de la URL o lanza 404.
function obtenerUsuario(req: Request): Usuario {
  const usuario = db.buscarPorId(req.params.user_id);
  if (!usuario) throw fallo.notFound('Usuario no encontrado.');
  return usuario;
}

// --- Perfil propio ----------------------------------------------------------

// GET /users/me
router.get('/me', (req: Request, res: Response) => {
  res.status(200).json(aPerfil(req.usuario!));
});

// PATCH /users/me  (por ahora solo full_name es editable)
router.patch('/me', (req: Request, res: Response) => {
  const { full_name } = req.body ?? {};
  if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim() === '')) {
    throw fallo.badRequest("'full_name' no puede estar vacío.");
  }
  if (full_name !== undefined) db.actualizarUsuario(req.usuario!, { full_name });
  res.status(200).json(aPerfil(req.usuario!));
});

// --- Administración (solo admin) -------------------------------------------

// GET /users?role=&status=&page=&limit=
router.get('/', soloAdmin, (req: Request, res: Response) => {
  let lista = db.usuarios;
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
router.get('/:user_id', soloAdmin, (req: Request, res: Response) => {
  res.status(200).json(aPerfil(obtenerUsuario(req)));
});

// PATCH /users/:user_id
router.patch('/:user_id', soloAdmin, (req: Request, res: Response) => {
  const usuario = obtenerUsuario(req);
  const { full_name } = req.body ?? {};
  if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim() === '')) {
    throw fallo.badRequest("'full_name' no puede estar vacío.");
  }
  if (full_name !== undefined) db.actualizarUsuario(usuario, { full_name });
  res.status(200).json(aPerfil(usuario));
});

// DELETE /users/:user_id
router.delete('/:user_id', soloAdmin, (req: Request, res: Response) => {
  obtenerUsuario(req); // 404 si no existe
  db.eliminarUsuario(req.params.user_id);
  res.status(204).send();
});

// PATCH /users/:user_id/role
router.patch('/:user_id/role', soloAdmin, (req: Request, res: Response) => {
  const usuario = obtenerUsuario(req);
  const { role } = req.body ?? {};
  if (role !== 'customer' && role !== 'admin') {
    throw fallo.badRequest("'role' debe ser 'customer' o 'admin'.");
  }
  db.actualizarUsuario(usuario, { role });
  res.status(200).json(aPerfil(usuario));
});

// PATCH /users/:user_id/status
router.patch('/:user_id/status', soloAdmin, (req: Request, res: Response) => {
  const usuario = obtenerUsuario(req);
  const { status } = req.body ?? {};
  if (status !== 'active' && status !== 'disabled') {
    throw fallo.badRequest("'status' debe ser 'active' o 'disabled'.");
  }
  db.actualizarUsuario(usuario, { status });
  if (status === 'disabled') db.revocarSesiones(usuario.user_id);
  res.status(200).json(aPerfil(usuario));
});

export default router;
