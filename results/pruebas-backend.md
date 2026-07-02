# Resultados de Pruebas - Backend Identity Service

> Fecha: 2026-07-01
> Rama: `main` (cambios locales sin commitear)
> Estado: **Funcional para demo**

---

## 1. Jerarquía de carpetas aplicada

```
src/
├── config/
│   └── supabase.ts          # Cliente Supabase configurado
├── controllers/             # (vacía - para futuro refactor)
├── middleware/                # (vacía - para futuro refactor)
├── models/                    # (vacía - para futuro refactor)
├── repositories/              # (vacía - para futuro refactor)
├── routes/                    # (vacía - para futuro refactor)
├── services/                  # (vacía - para futuro refactor)
├── utils/                     # (vacía - para futuro refactor)
├── auth.ts                    # Endpoints de autenticación
├── helpers.ts                 # Config, errores, JWT, middlewares
├── server.ts                  # Punto de entrada Express
├── store.ts                   # Capa de datos (Supabase Auth)
├── types.ts                   # Tipos extendidos de Express
└── users.ts                   # Endpoints de usuarios
```

---

## 2. Variables de entorno requeridas (`.env`)

```bash
PORT=8080
NODE_ENV=development

# OBLIGATORIO - para firmar JWTs locales
JWT_SECRET=secreto-de-prueba-local-cambia-en-produccion

# OBLIGATORIO - conexión a Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# OPCIONAL
ACCESS_TOKEN_TTL=3600
```

---

## 3. Levantar el servidor

```bash
npm run dev
# o
npm start
# o
npx tsx src/server.ts
```

El servidor corre en: `http://localhost:8080`

Documentación Swagger: `http://localhost:8080/docs`

---

## 4. Pruebas realizadas

### 4.1 Registrar usuario de demo

**Comando (PowerShell):**
```powershell
Invoke-WebRequest -Uri http://localhost:8080/auth/register -Method POST -ContentType "application/json" -Body '{"email":"demo@correo.cl","password":"DemoClave123","full_name":"Usuario Demo"}' -UseBasicParsing
```

**Comando (Git Bash / Linux / Mac):**
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@correo.cl","password":"DemoClave123","full_name":"Usuario Demo"}'
```

**Resultado:**
```json
{
  "user": {
    "user_id": "2cf4210b-149b-4d74-a550-ad5f5803c849",
    "business_user_id": "USR-01",
    "email": "demo@correo.cl",
    "full_name": "Usuario Demo",
    "role": "customer",
    "status": "active",
    "email_verified": true,
    "created_at": "2026-07-02T01:11:00.000Z",
    "updated_at": "2026-07-02T01:11:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "mock_a3f2b1...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

- **HTTP Status:** `201 Created`
- **Nota:** El usuario queda guardado en `auth.users` de Supabase con los datos de negocio en `user_metadata`.

---

### 4.2 Login con usuario existente

**Comando (PowerShell):**
```powershell
Invoke-WebRequest -Uri http://localhost:8080/auth/login -Method POST -ContentType "application/json" -Body '{"email":"demo@correo.cl","password":"DemoClave123"}' -UseBasicParsing
```

**Comando (Git Bash):**
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@correo.cl","password":"DemoClave123"}'
```

**Resultado:**
```json
{
  "user": { ...mismos datos que register... },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "mock_...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

- **HTTP Status:** `200 OK`
- **Nota:** El backend valida email/password directamente contra **Supabase Auth** (`supabase.auth.signInWithPassword()`).

---

### 4.3 Obtener perfil propio (endpoint protegido)

**Comando (PowerShell):**
```powershell
Invoke-WebRequest -Uri http://localhost:8080/users/me -Method GET -Headers @{Authorization="Bearer eyJhbGciOiJIUzI1NiIs..."} -UseBasicParsing
```

**Comando (Git Bash):**
```bash
curl -X GET http://localhost:8080/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Resultado:**
```json
{
  "user_id": "2cf4210b-149b-4d74-a550-ad5f5803c849",
  "business_user_id": "USR-01",
  "email": "demo@correo.cl",
  "full_name": "Usuario Demo",
  "role": "customer",
  "status": "active",
  "email_verified": true,
  "created_at": "2026-07-02T01:11:00.000Z",
  "updated_at": "2026-07-02T01:11:00.000Z"
}
```

- **HTTP Status:** `200 OK`

---

### 4.4 Validar token (endpoint para otros grupos)

**Comando (PowerShell):**
```powershell
Invoke-WebRequest -Uri http://localhost:8080/auth/validate -Method GET -Headers @{Authorization="Bearer eyJhbGciOiJIUzI1NiIs..."} -UseBasicParsing
```

**Resultado:**
```json
{
  "valid": true,
  "user_id": "2cf4210b-149b-4d74-a550-ad5f5803c849",
  "business_user_id": "USR-01",
  "email": "demo@correo.cl",
  "role": "customer",
  "status": "active",
  "expires_at": "2026-07-02T02:11:10.000Z"
}
```

- **HTTP Status:** `200 OK`

---

### 4.5 Decodificar access token manualmente

**Comando (Node.js):**
```bash
node -e "const t='eyJhbG...'; const p=JSON.parse(Buffer.from(t.split('.')[1],'base64').toString()); console.log(JSON.stringify(p,null,2));"
```

**Payload decodificado (ejemplo):**
```json
{
  "sub": "2cf4210b-149b-4d74-a550-ad5f5803c849",
  "email": "demo@correo.cl",
  "role": "customer",
  "status": "active",
  "business_user_id": "USR-01",
  "iat": 1721779476,
  "exp": 1721783076
}
```

---

## 5. Endpoints disponibles para el frontend

| Método | Endpoint | Auth | Body | Descripción |
|--------|----------|------|------|-------------|
| `POST` | `/auth/register` | No | `{email, password, full_name}` | Crear cuenta |
| `POST` | `/auth/login` | No | `{email, password}` | Iniciar sesión |
| `POST` | `/auth/refresh` | No | `{refresh_token}` | Renovar access token |
| `POST` | `/auth/logout` | Bearer | `{refresh_token?}` | Cerrar sesión |
| `POST` | `/auth/change-password` | Bearer | `{current_password, new_password}` | Cambiar contraseña |
| `POST` | `/auth/forgot-password` | No | `{email}` | Solicitar reset |
| `POST` | `/auth/reset-password` | No | `{reset_token, new_password}` | Resetear contraseña |
| `GET` | `/auth/validate` | Bearer | — | Validar token (para otros grupos) |
| `GET` | `/users/me` | Bearer | — | Perfil propio |
| `PATCH` | `/users/me` | Bearer | `{full_name}` | Editar perfil |
| `GET` | `/users` | Bearer (admin) | — | Listar usuarios |
| `GET` | `/users/:user_id` | Bearer (admin) | — | Ver usuario |
| `PATCH` | `/users/:user_id` | Bearer (admin) | `{full_name}` | Editar usuario |
| `DELETE` | `/users/:user_id` | Bearer (admin) | — | Eliminar usuario |
| `PATCH` | `/users/:user_id/role` | Bearer (admin) | `{role}` | Cambiar rol |
| `PATCH` | `/users/:user_id/status` | Bearer (admin) | `{status}` | Cambiar estado |
| `GET` | `/health` | No | — | Healthcheck |
| `GET` | `/docs` | No | — | Swagger UI |

---

## 6. Resumen de cambios en archivos (sin commitear)

| Archivo | Cambio principal |
|---------|------------------|
| `src/config/supabase.ts` | Cliente Supabase nuevo, usa `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| `src/store.ts` | Ya no usa array hardcodeado; delega todo a `supabase.auth.admin.*` y `supabase.auth.signInWithPassword()` |
| `src/auth.ts` | Login valida contra Supabase Auth; register crea en Supabase |
| `src/users.ts` | CRUD lee/escribe en Supabase Auth via `user_metadata` |
| `src/helpers.ts` | Adaptado al campo `id` de Supabase (UUID) |

---

## 7. Notas para el compañero de frontend

1. **CORS ya está habilitado** (`app.use(cors())`). El frontend puede correr en cualquier puerto y llamar al backend en `localhost:8080`.
2. **Guardar el `access_token`** después del login (localStorage o cookie) y enviarlo en cada request protegido como:
   ```
   Authorization: Bearer <access_token>
   ```
3. El `access_token` expira en `3600` segundos (1 hora). Usar `/auth/refresh` con el `refresh_token` para obtener uno nuevo.
4. Para crear un **admin**, se debe editar manualmente el `role` en Supabase Dashboard o usar el endpoint `PATCH /users/:user_id/role` con un usuario que ya sea admin.
5. No se requiere crear tablas adicionales en Supabase. Todo vive en `auth.users` usando `user_metadata`.

---

## 8. Estado del repositorio

- `git status` muestra 4 archivos modificados (no commiteados):
  - `src/auth.ts`
  - `src/helpers.ts`
  - `src/store.ts`
  - `src/users.ts`
- `.env` existe localmente pero está en `.gitignore` (no se sube).
- `.env.example` está actualizado en el repo como referencia.
