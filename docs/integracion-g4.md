# Integración con G2 (Identidad) — Guía para G4 (Carrito)

Todo lo que G4 necesita para validar la sesión/identidad de un usuario contra el
servicio de G2.

## 1. URL y estado

| | |
|---|---|
| **Estado** | ✅ Desplegado y funcional, con persistencia en Supabase. |
| **URL base** | `https://auth-minimarket-cloud.onrender.com` |
| **Docs interactivas** | [`/docs`](https://auth-minimarket-cloud.onrender.com/docs) (Swagger UI) · Contrato: `/openapi.json` |
| **Health** | [`/health`](https://auth-minimarket-cloud.onrender.com/health) → `{"status":"ok"}` |

> ⚠️ Es plan **free** de Render: si el servicio estuvo inactivo, la **primera**
> petición puede tardar ~30-50 s en "despertar". Las siguientes son normales.

## 2. El endpoint que les interesa: `GET /auth/validate`

Es el endpoint pensado para otros grupos. G4 envía el **token del usuario** (el
que obtiene al hacer login) y recibe su identidad y rol vigentes.

```
GET https://auth-minimarket-cloud.onrender.com/auth/validate
Authorization: Bearer <access_token del usuario>
```

- **200** → token válido y cuenta activa. Devuelve identidad + `business_user_id`.
- **401** → token ausente, inválido o expirado.
- **403** → token válido pero la cuenta está `disabled`.

El campo clave para G4 es **`business_user_id`** (ej. `"USR-10"`): úsenlo para
asociar el carrito al usuario, no el email.

## 3. Ejemplos de respuesta (reales, de producción)

**200 OK** (`GET /auth/validate` con token válido):

```json
{
  "valid": true,
  "user_id": "4144623d-d8e4-4772-801d-284e74f7425a",
  "business_user_id": "USR-10",
  "email": "g4-test@correo.cl",
  "role": "customer",
  "status": "active",
  "expires_at": "2026-07-07T20:39:21.000Z"
}
```

**401 Unauthorized** (token ausente o inválido):

```json
{
  "timestamp": "2026-07-07T19:20:56.701Z",
  "status": 401,
  "code": "UNAUTHORIZED",
  "message": "Token inválido.",
  "correlationId": null
}
```

> Formato de error unificado del ecosistema: `{ timestamp, status, code, message, correlationId }`.

## 4. Usuario de prueba y token

Cuenta de prueba creada para G4 (ya existe en Supabase):

| Email | Password | Rol | business_user_id |
|-------|----------|-----|------------------|
| `g4-test@correo.cl` | `TestG4Clave123` | customer | USR-10 |

El **access_token es un JWT** con estos claims (payload):

```json
{
  "sub": "4144623d-d8e4-4772-801d-284e74f7425a",
  "email": "g4-test@correo.cl",
  "role": "customer",
  "status": "active",
  "business_user_id": "USR-10",
  "iat": 1783453161,
  "exp": 1783456761
}
```

> El token **expira en 1 hora** (`exp`). No lo hardcodeen: obtengan uno fresco
> con login (paso 1 de abajo).

## 5. Pasos para que G4 pruebe

**Paso 1 — Obtener un token (login):**

```bash
curl -X POST https://auth-minimarket-cloud.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"g4-test@correo.cl","password":"TestG4Clave123"}'
```

La respuesta trae `access_token`. Cópienlo.

**Paso 2 — Validar la sesión con ese token:**

```bash
curl https://auth-minimarket-cloud.onrender.com/auth/validate \
  -H "Authorization: Bearer <PEGAR_ACCESS_TOKEN>"
```

Debe devolver el `200` del punto 3 con el `business_user_id`.

**Paso 3 — Probar el caso de error (sin token):**

```bash
curl https://auth-minimarket-cloud.onrender.com/auth/validate
```

Debe devolver `401`.

> En Postman/Swagger es lo mismo: login → copiar `access_token` → mandarlo como
> `Authorization: Bearer <token>` en `/auth/validate`. La UI de Swagger está en
> `/docs` (usen el botón **Authorize** para pegar el token).

## 6. Cómo integrarlo en el carrito (sugerencia)

En cada request del carrito que llegue con el token del usuario:

1. Llamar a `GET /auth/validate` con `Authorization: Bearer <token del usuario>`.
2. Según la respuesta:
   - **200** → usuario autenticado. Usar `business_user_id` para vincular el carrito.
   - **401** → rechazar (token inválido/expirado) → pedir re-login.
   - **403** → cuenta deshabilitada → denegar.
3. (Opcional) Enviar el header `X-Consumer: cart-service` para trazabilidad.

Cada usuario obtiene su token haciendo login en `POST /auth/login` (o registrándose
en `POST /auth/register`). G4 no necesita gestionar contraseñas: sólo validar tokens.
