# Resumen Ejecutivo — Servicio de Identidad (Grupo 2)

> Documento de apoyo para la presentación del equipo.
> Proyecto: **Identity Service (G2)** del Minimarketplace · Contrato `v1.2.0`.

---

## 1. ¿Qué es y para qué sirve?

Es el **servicio de Identidad, Usuarios y Sesiones** del Minimarketplace: la pieza
que se encarga de **registrar usuarios, autenticarlos (login) y validar su sesión**
para el resto de los grupos del ecosistema.

En pocas palabras: **cualquier otro servicio que necesite saber "¿quién es este
usuario y puede hacer esto?" nos pregunta a nosotros.** Damos identidad, rol y
estado de la cuenta.

**Grupos que dependen de nosotros:** G4 (Carrito), G5 (Pedidos), G9 (Notificaciones).

---

## 2. Estado del proyecto

| Aspecto | Estado |
|---|---|
| Backend (API REST) | ✅ Funcional y desplegado |
| Persistencia real (Supabase) | ✅ Conectado (Auth + PostgreSQL) |
| Despliegue en la nube (Render) | ✅ Público y en línea |
| CI/CD automático (GitHub Actions) | ✅ Verifica, despliega y prueba en cada push |
| Panel de administración web | ✅ App React desplegable en Vercel |
| Portal de clientes web | ✅ App React (registro, login, recuperar contraseña, cuenta) |
| Frontend demo de autenticación | ✅ Incluido para demostraciones |
| Documentación interactiva (Swagger) | ✅ Disponible en `/docs` |

**URL pública:** `https://auth-minimarket-cloud.onrender.com`
**Documentación en vivo:** `https://auth-minimarket-cloud.onrender.com/docs`

> Nota para la demo: el hosting es plan **free**, si estuvo inactivo la **primera**
> petición puede tardar ~30-50 s en "despertar". Conviene hacer una llamada de
> calentamiento antes de presentar.

---

## 3. Arquitectura en una frase

Una **API REST** hecha en **Node.js + Express + TypeScript**, que emite **tokens
JWT reales**, guarda usuarios y perfiles en **Supabase (Auth + PostgreSQL)**, y
está desplegada en **Render** con **integración/despliegue continuo** desde GitHub.

```
Usuario / Otros grupos (G4, G5, G9)
        │  (HTTP + token JWT)
        ▼
   API de Identidad (Express + TypeScript)  ──►  Supabase (Auth + PostgreSQL)
        │
        ├─ Panel Admin (React) para gestión de usuarios
        └─ Frontend demo para mostrar login/registro
```

---

## 4. Funcionalidades principales

**Autenticación (Auth)**
- Registro de usuarios y login.
- Sesión con **JWT** (access token + refresh token para renovar sin re-login).
- Cambio de contraseña, recuperación ("olvidé mi contraseña") y logout.
- **`/auth/validate`**: el endpoint clave que consumen los otros grupos para
  validar la sesión de un usuario.

**Gestión de usuarios (Users)**
- Cada usuario ve y edita su propio perfil.
- Los **administradores** pueden: listar usuarios (con filtros y paginación),
  editar, cambiar rol, activar/deshabilitar cuentas y eliminar.

**Roles y control de acceso**
- Dos roles: `customer` y `admin`.
- Rutas protegidas por token (Bearer) y por rol.

---

## 5. La pieza más importante para la presentación: `GET /auth/validate`

Es **el punto de integración con todo el ecosistema**. Otro grupo manda el token
del usuario y recibe su identidad y rol vigentes:

- **200** → token válido y cuenta activa → devuelve identidad + `business_user_id`.
- **401** → token ausente, inválido o **expirado**.
- **403** → token válido pero la cuenta está **deshabilitada**.

**Dato clave:** cada usuario tiene **dos identificadores**:
- `user_id` — UUID interno de Supabase.
- `business_user_id` — legible (`USR-10`), el que usan los demás grupos para
  vincular carrito, pedidos, etc.

> **Caso crítico E1** (para destacar en la demo): expiración de sesión. Con un TTL
> corto se puede mostrar en vivo cómo un token expira y `/auth/validate` responde `401`.

---

## 6. Calidad, pruebas y documentación

- **Documentación interactiva** con Swagger UI en `/docs`, generada desde el
  contrato OpenAPI — siempre refleja la API real.
- **Colección de Postman** con pruebas de contrato que encadenan tokens y validan
  códigos de estado y esquemas.
- **CI/CD** (GitHub Actions): en cada push a `main` verifica el código (typecheck +
  build), despliega solo si pasa, y corre un **smoke test** contra la URL pública.
- **Formato de errores unificado** para todo el ecosistema (`timestamp`, `status`,
  `code`, `message`, `correlationId`) + trazabilidad con headers de correlación.

---

## 7. Componentes entregables (qué se puede mostrar)

| Componente | Qué es | Para la demo |
|---|---|---|
| **API de Identidad** | El backend REST desplegado | Probar endpoints en vivo desde Swagger |
| **Panel de Administración** | App web (React) para admins | Mostrar login admin, listar/crear/editar usuarios |
| **Portal de Clientes** | App web (React) para el usuario final | Registro, login, recuperar contraseña y gestión de cuenta |
| **Frontend demo** | Página simple de login/registro | Mostrar el flujo de usuario final sin build |
| **Swagger `/docs`** | Documentación interactiva | Ejecutar `/auth/login` y `/auth/validate` en vivo |
| **Guía de integración G4** | Documento para el grupo del Carrito | Explicar cómo otros grupos nos consumen |

---

## 8. Stack tecnológico

- **Backend:** Node.js, Express, TypeScript.
- **Auth y base de datos:** Supabase (Auth + PostgreSQL), JWT (`jsonwebtoken`).
- **Documentación:** OpenAPI + Swagger UI.
- **Panel admin:** React + Vite (desplegable en Vercel).
- **Infraestructura:** Render (hosting), GitHub Actions (CI/CD), Postman/Newman (pruebas).

---

## 9. Guion sugerido para la presentación (5 pasos)

1. **Contexto** — "Somos la identidad del Minimarketplace: sin nosotros nadie sabe
   quién es cada usuario." (secciones 1 y 2)
2. **Arquitectura** — mostrar el diagrama y el stack. (secciones 3 y 8)
3. **Demo en vivo** — abrir Swagger `/docs`, hacer login y validar el token con
   `/auth/validate`. (sección 5)
4. **Panel de admin** — mostrar gestión de usuarios (listar, cambiar rol, deshabilitar).
5. **Integración y calidad** — cómo nos consume G4, CI/CD y las pruebas automáticas.
   (secciones 5 y 6)

---

*Grupo 2 — Identidad, Usuarios y Sesiones · Minimarketplace · Contrato `v1.2.0`.*
