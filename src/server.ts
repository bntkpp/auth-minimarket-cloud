import 'dotenv/config';
import 'express-async-errors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

import { config, manejadorErrores, fallo } from './helpers.js';
import authRouter from './auth.js';
import usersRouter from './users.js';

const app = express();

// Carga el contrato OpenAPI (docs/openapi.yaml) para servir la documentación.
const dirActual = path.dirname(fileURLToPath(import.meta.url));
const openapiPath = path.resolve(dirActual, '../docs/openapi.yaml');
let openapiDoc: swaggerUi.JsonObject | null = null;
let openapiRaw = '';
try {
  openapiRaw = fs.readFileSync(openapiPath, 'utf8');
  openapiDoc = YAML.parse(openapiRaw) as swaggerUi.JsonObject;
} catch (e) {
  console.warn('No se pudo cargar docs/openapi.yaml para Swagger:', (e as Error).message);
}

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

// Documentación interactiva (Swagger UI) a partir del contrato OpenAPI.
if (openapiDoc) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc, {
    customSiteTitle: 'Identity Service API (G2)',
  }));
  // El contrato crudo, por si otro grupo quiere consumirlo o importarlo.
  app.get('/openapi.json', (_req: Request, res: Response) => res.json(openapiDoc));
  app.get('/openapi.yaml', (_req: Request, res: Response) => res.type('text/yaml').send(openapiRaw));
}

// Raíz: redirige a la documentación.
app.get('/', (_req: Request, res: Response) => res.redirect('/docs'));

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
  console.log('  Identity Service API (G2) - Supabase Edition');
  console.log(`  URL:    http://localhost:${config.port}`);
  console.log(`  Docs:   http://localhost:${config.port}/docs`);
  console.log(`  Health: http://localhost:${config.port}/health`);
  console.log('==================================================');
});
