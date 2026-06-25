# Identity Service API (G2) — Mock

> **Grupo 2 — Identidad, Usuarios y Sesiones** del Minimarketplace.
> Registro, login, sesión/token, roles y validación de identidad para el resto
> del ecosistema (G4 Carro, G5 Pedidos, G9 Notificaciones).

Mock **funcional** del [contrato REST](docs/openapi.yaml) construido con
**Node.js + Express + TypeScript**. Emite **JWT reales** y mantiene el estado en
memoria, así que corre al instante sin base de datos. Está **listo para conectar
Supabase** (Auth + tabla `public.profiles`) sin cambiar el contrato de salida.

- **Backend de auth (objetivo):** Supabase Auth (JWT access + refresh token).
- **Persistencia de perfil/roles (objetivo):** PostgreSQL (Supabase), `public.profiles`.
- **Convención de nombres:** `snake_case` en todo el JSON (igual que las columnas).

---

## 1. Cómo correrlo (local)

Requisitos: Node.js ≥ 18.

```bash
npm install
npm start          # corre el TypeScript directo con tsx
```

Scripts disponibles:

| Script            | Qué hace                                              |
|-------------------|-------------------------------------------------------|
| `npm start`       | Levanta el servidor (`tsx src/server.ts`)             |
| `npm run dev`     | Igual, con auto-reload al guardar (`tsx watch`)       |
| `npm run typecheck` | Verifica tipos sin ejecutar (`tsc --noEmit`)        |
| `npm run build`   | Compila a JavaScript en `dist/` (`tsc`)               |

El servidor queda en `http://localhost:8080`.
Health check: `GET http://localhost:8080/health`.

> No necesitas `.env` para el modo mock. Si quieres personalizar (puerto, TTL del
> token, Supabase), copia `.env.example` a `.env`.

### Usuarios sembrados (para probar de inmediato)

| Email             | Password        | Rol        | Estado |
|-------------------|-----------------|------------|--------|
| `juan@correo.cl`  | `MiClave123`    | `customer` | active |
| `maria@correo.cl` | `AdminClave123` | `admin`    | active |

---

## 2. Prueba rápida (curl)

```bash
# Login
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@correo.cl","password":"MiClave123"}'

# Validar sesión (reemplaza <ACCESS_TOKEN>)
curl -s http://localhost:8080/auth/validate \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 3. Endpoints (contrato)

### Auth
| Método | Ruta                     | Auth | Descripción                                  |
|--------|--------------------------|------|----------------------------------------------|
| POST   | `/auth/register`         | —    | Crear usuario (rol `customer`) + tokens      |
| POST   | `/auth/login`            | —    | Iniciar sesión                               |
| POST   | `/auth/refresh`          | —    | Renovar access token con el refresh token    |
| POST   | `/auth/change-password`  | ✅   | Cambiar contraseña (sesión autenticada)      |
| POST   | `/auth/forgot-password`  | —    | Solicitar recuperación (siempre 200)         |
| POST   | `/auth/reset-password`   | —    | Confirmar nueva contraseña con `reset_token` |
| POST   | `/auth/logout`           | ✅   | Cerrar sesión (revoca refresh token)         |
| GET    | `/auth/validate`         | ✅   | **Validar sesión para otros servicios**      |

### Users
| Método | Ruta                       | Auth        | Descripción                          |
|--------|----------------------------|-------------|--------------------------------------|
| GET    | `/users/me`                | ✅          | Perfil propio                        |
| PATCH  | `/users/me`                | ✅          | Actualizar perfil propio             |
| GET    | `/users`                   | ✅ admin    | Listar usuarios (paginado + filtros) |
| GET    | `/users/{user_id}`         | ✅ admin    | Perfil por UUID                      |
| PATCH  | `/users/{user_id}`         | ✅ admin    | Actualizar perfil ajeno              |
| DELETE | `/users/{user_id}`         | ✅ admin    | Eliminar usuario (hard delete)       |
| PATCH  | `/users/{user_id}/role`    | ✅ admin    | Cambiar rol                          |
| PATCH  | `/users/{user_id}/status`  | ✅ admin    | Activar / deshabilitar               |

### Dos identificadores por usuario (integración con el ecosistema)
- `user_id` — **UUID** de Supabase Auth (claim `sub` del JWT). Identidad interna.
- `business_user_id` — legible (`USR-01`), lo usan G4/G5/G9.

`GET /auth/validate` y `UserProfile` exponen **ambos**. Ver
[docs/data-model.md](docs/data-model.md).

---

## 4. Colección de pruebas

En [`postman/`](postman/):

- `Identity-Service-G2.postman_collection.json` — pruebas de contrato (encadenan
  tokens y validan códigos de estado + esquema).
- `Identity-Service-G2.postman_environment.json` — environment local.

Importa ambos en Postman/Insomnia y ejecuta el folder **Auth** y luego **Users**
(con el *Collection Runner* corre todo de una). También sirve para Bruno/Insomnia.

---

## 5. Modelo de datos

- Documento: [docs/data-model.md](docs/data-model.md) (diagrama ER + tablas).
- SQL para Supabase: [docs/supabase-schema.sql](docs/supabase-schema.sql).

---

## 6. Convención de errores

Formato unificado del ecosistema (esquema `Error` del contrato):

```json
{
  "timestamp": "2026-06-17T12:00:00Z",
  "status": 400,
  "code": "BAD_REQUEST",
  "message": "El campo 'email' no tiene un formato válido.",
  "correlationId": "b1d4e8a0-3f2c-4a1b-9c8d-1a2b3c4d5e6f"
}
```

| HTTP | code                   | Cuándo                                            |
|------|------------------------|---------------------------------------------------|
| 400  | `BAD_REQUEST`          | Payload inválido / malformado                     |
| 401  | `UNAUTHORIZED`         | Token ausente, inválido o expirado                |
| 401  | `INVALID_CREDENTIALS`  | Email/contraseña incorrectos; password actual mal |
| 401  | `INVALID_RESET_TOKEN`  | Token de recuperación inválido/expirado           |
| 403  | `FORBIDDEN`            | Rol/estado no autoriza (p. ej. cuenta `disabled`) |
| 404  | `NOT_FOUND`            | Recurso inexistente                               |
| 409  | `EMAIL_ALREADY_EXISTS` | Email ya registrado                               |
| 422  | `WEAK_PASSWORD`        | Contraseña < 8 caracteres                         |
| 500  | `INTERNAL_ERROR`       | Fallo no controlado                               |

> El contrato también define `429 RATE_LIMITED` (anti fuerza bruta). Esta
> versión básica del mock no lo implementa; se puede añadir más adelante.

### Trazabilidad
Todas las operaciones aceptan `X-Request-Id`, `X-Correlation-Id` y `X-Consumer`
(opcionales). El servicio los refleja en la respuesta y `correlationId` aparece
en los errores.

---

## 7. Caso crítico E1 — expiración y validación de sesión

`GET /auth/validate` es el endpoint que consumen otros grupos:

- Token válido y cuenta `active` → **200** con identidad y rol.
- Token ausente/inválido/**expirado** → **401**.
- Token válido pero cuenta `disabled` → **403**.

**Para demostrar la expiración** pon un TTL corto y observa el 401:

```bash
# .env
ACCESS_TOKEN_TTL=10      # el access token expira en 10 segundos
```

Haz login, espera 10 s y llama a `/auth/validate`: responderá `401 UNAUTHORIZED`.

---

## 8. Probar `reset-password` en el mock

El mock no envía correos. Por eso, **fuera de producción**, `POST
/auth/forgot-password` devuelve el token de recuperación en el header
`X-Mock-Reset-Token` (y lo imprime en consola). Úsalo en `POST
/auth/reset-password`. El body de la respuesta se mantiene fiel al contrato
(solo `message`). La colección de Postman ya hace este encadenado automáticamente.

---

## 9. Conectar Supabase (cuando toque)

La idea es reemplazar el store en memoria por Supabase **sin cambiar las rutas
ni el contrato de salida**:

1. Crea el proyecto en Supabase y ejecuta [docs/supabase-schema.sql](docs/supabase-schema.sql)
   en el SQL Editor (crea `profiles`, enums, triggers y RLS).
2. En `.env`:
   ```bash
   SUPABASE_URL=https://<tu-proyecto>.supabase.co
   SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```
3. Instala el SDK (`npm install @supabase/supabase-js`) y, en `src/auth.ts` /
   `src/users.ts`, cambia las llamadas a `store.ts` por llamadas a Supabase
   (`supabase.auth.signInWithPassword`, `supabase.auth.getUser`, consultas a
   `profiles`, etc.). Los handlers siguen devolviendo el mismo JSON.

---

## 10. Deploy del mock público (Render)

1. Sube este repo a GitHub.
2. En [Render](https://render.com): **New + → Blueprint** y selecciona el repo
   (usa [`render.yaml`](render.yaml)). O **New + → Web Service** manual con:
   - Build: `npm install`
   - Start: `npm start`
   - Health check path: `/health`
3. Render asigna una URL pública (`https://identity-service-g2.onrender.com`).
   Cámbiala en la variable `base_url` de Postman para que el resto de grupos
   apunten ahí.

> También funciona en Railway (incluye `Procfile`). Nota: el estado vive en
> memoria, así que se reinicia con cada redeploy (es un mock).

---

## 11. Estructura del proyecto

```
tsconfig.json     # configuración de TypeScript
src/
├── server.ts     # configura Express (cors, json, rutas) y arranca el servidor
├── store.ts      # "base de datos" en memoria: usuarios, sesiones, seed (con tipos)
├── helpers.ts    # config, errores del contrato, JWT y middlewares de auth
├── types.ts      # extiende Express.Request (req.usuario, req.token...)
├── auth.ts       # rutas /auth/* (register, login, validate, ...)
└── users.ts      # rutas /users/* (perfil propio + administración)
docs/
├── openapi.yaml          # contrato REST (fuente de verdad)
├── data-model.md         # modelo de datos (diagrama + tablas)
└── supabase-schema.sql   # DDL para Supabase
postman/                  # colección + environment
```

> **Cómo está organizado (para explicarlo):** `server.ts` enchufa los dos
> routers; cada router (`auth.ts`, `users.ts`) tiene un handler por endpoint que
> valida con `if`, usa `store.ts` para leer/escribir datos y responde con el JSON
> del contrato. `helpers.ts` concentra lo común (tokens, errores, middlewares) y
> `store.ts` define la interfaz `Usuario` con sus tipos.

---

Grupo 2 — Identidad, Usuarios y Sesiones · Contrato `v1.2.0`.
