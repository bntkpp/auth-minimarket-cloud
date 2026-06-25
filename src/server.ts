import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

import { config, manejadorErrores, fallo } from './helpers.js';
import authRouter from './auth.js';
import usersRouter from './users.js';

const app = express();

app.use(cors());            // permite que otros grupos llamen al servicio
app.use(express.json());    // parsea el body JSON

// Deja un correlationId disponible para el formato de error (trazabilidad).
app.use((req: Request, res: Response, next: NextFunction) => {
  const cid = req.headers['x-correlation-id'] ?? req.headers['x-request-id'] ?? null;
  req.correlationId = Array.isArray(cid) ? cid[0] : cid;
  if (req.correlationId) res.setHeader('X-Correlation-Id', req.correlationId);
  next();
});

// Healthcheck (útil para Render/Railway y para los otros grupos).
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'identity-service' });
});

// Rutas del contrato.
app.use('/auth', authRouter);
app.use('/users', usersRouter);

// Cualquier otra ruta -> 404 con el formato del contrato.
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(fallo.notFound(`Ruta no encontrada: ${req.method} ${req.path}`));
});

// Manejador final de errores.
app.use(manejadorErrores);

app.listen(config.port, () => {
  console.log('==================================================');
  console.log('  Identity Service API (G2) - Mock (TypeScript)');
  console.log(`  URL:    http://localhost:${config.port}`);
  console.log(`  Health: http://localhost:${config.port}/health`);
  console.log('--------------------------------------------------');
  console.log('  Usuarios de prueba:');
  console.log('   - juan@correo.cl   / MiClave123     (customer)');
  console.log('   - maria@correo.cl  / AdminClave123  (admin)');
  console.log('==================================================');
});
