# Portal de Clientes (G2)

Portal web (React + Vite) para los **clientes** del Minimarketplace: registrarse,
iniciar sesión, recuperar la contraseña y gestionar su cuenta. Consume
**directamente la API de Identidad (G2)**.

Es el complemento del [`admin-panel/`](../admin-panel/): mismo servicio de fondo,
misma paleta y marca, pero orientado al **usuario final** (rol `customer`) en vez
de a la administración.

## Funcionalidades

- **Registro** de cuenta nueva (nace con rol `customer`).
- **Login** con email y contraseña.
- **Recuperar contraseña** por correo real, con el flujo nativo de Supabase
  (envía un email con un enlace → el usuario fija su nueva contraseña).
- **Mi cuenta**: ver perfil, editar nombre y cambiar contraseña.
- **Sesión persistente** con **renovación automática** del token (auto-refresh),
  igual que un sitio real: la sesión sobrevive al recargar y el token se renueva
  solo antes de expirar.

## Correr en local

```bash
npm install
npm run dev
```

Abre el link que muestra Vite (por defecto `http://localhost:5174`; el
`admin-panel` usa el 5173, así que puedes correr ambos a la vez).

Por defecto apunta al G2 desplegado en Render. Para configurar variables, copia
`.env.example` a `.env`:

```bash
VITE_API_URL=https://auth-minimarket-cloud.onrender.com
# Necesarias SOLO para "recuperar contraseña" (ver sección más abajo):
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key pública>
```

> Sin las variables `VITE_SUPABASE_*`, todo el portal funciona igual salvo la
> recuperación de contraseña, que muestra un aviso de "no configurada".

## Deploy en Vercel

1. **New Project** → importar el repo.
2. Si el portal está en un subdirectorio, en **Root Directory** poné `customer-panel`.
3. Framework: **Vite** (lo detecta solo). Build: `npm run build`. Output: `dist`.
4. En **Settings → Environment Variables** agregá `VITE_API_URL` con la URL de G2.
5. Deploy.

> G2 tiene CORS abierto, así que el portal desplegado puede llamarlo sin
> configuración extra.

## Arquitectura

Separación por responsabilidad (buenas prácticas):

```
customer-panel/
├── index.html
├── vite.config.js              # puerto 5174 para convivir con el admin-panel
├── .env.example                # VITE_API_URL
└── src/
    ├── main.jsx                # monta la app dentro de <ToastProvider>
    ├── App.jsx                 # sesión, arranque, auto-refresh y modo recuperación
    ├── api.js                  # cliente HTTP + endpoints de G2 (una sola fuente)
    ├── session.js              # persistencia de tokens/perfil en localStorage
    ├── supabase.js             # cliente Supabase SOLO para recuperar contraseña
    ├── toast.jsx               # notificaciones reutilizables (contexto)
    ├── styles.css              # estilos (misma paleta que el admin-panel)
    └── components/
        ├── AuthScreen.jsx      # orquesta login / registro / olvidé / reset
        ├── LoginForm.jsx
        ├── RegisterForm.jsx
        ├── ForgotPasswordForm.jsx  # envía el correo (Supabase)
        ├── ResetPasswordForm.jsx   # fija la nueva contraseña (Supabase)
        ├── Account.jsx         # perfil + editar nombre + cambiar contraseña
        └── PasswordInput.jsx   # campo de contraseña con mostrar/ocultar
```

**Cómo fluye:** `App.jsx` mantiene la sesión (tokens en `session.js`) y decide si
mostrar `AuthScreen` (sin sesión) o `Account` (con sesión). Todas las llamadas al
backend pasan por `api.js`, que adjunta el token y normaliza los errores del
contrato de G2. La renovación del access token se programa sola y se reprograma en
cada ciclo; si falla, cierra la sesión.

## Endpoints de G2 que usa

| Acción | Método | Ruta |
|--------|--------|------|
| Registro | POST | `/auth/register` |
| Login | POST | `/auth/login` |
| Renovar token | POST | `/auth/refresh` |
| Logout | POST | `/auth/logout` |
| Validar sesión | GET | `/auth/validate` |
| Cambiar contraseña (logueado) | POST | `/auth/change-password` |
| Mi perfil | GET | `/users/me` |
| Editar nombre | PATCH | `/users/me` |

> La **recuperación** de contraseña ("olvidé mi contraseña") NO usa G2: va por el
> flujo nativo de Supabase (ver la sección siguiente). Los endpoints
> `/auth/forgot-password` y `/auth/reset-password` de G2 siguen existiendo para el
> contrato del ecosistema, pero este portal ya no los consume.

## Recuperación de contraseña (Supabase) — configuración

La recuperación envía un **correo real** con el flujo nativo de Supabase Auth. Para
que funcione hay que hacer dos cosas (una sola vez):

**1. Variables del portal** (`.env` local y/o Environment Variables en Vercel):

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=<anon/public key>
```

> Supabase → **Project Settings → API**: copia *Project URL* y la *anon public*
> key. La `anon` key es pública y está pensada para el frontend; **no** uses aquí
> la `service_role` (esa es secreta y va solo en el backend G2).

**2. Redirect URLs en Supabase** para que el enlace del correo pueda volver al
portal: Supabase → **Authentication → URL Configuration → Redirect URLs**, agrega
las URLs del portal (ej. `http://localhost:5174` y la URL de Vercel).

**Cómo funciona el flujo:**

1. El usuario pide recuperación → el portal llama a
   `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
2. Supabase envía un correo con un enlace que vuelve al portal.
3. Al volver, Supabase detecta el token en la URL y `App.jsx` entra en "modo
   recuperación" (evento `PASSWORD_RECOVERY`), mostrando el formulario de nueva
   contraseña.
4. El portal llama a `supabase.auth.updateUser({ password })` y cierra la sesión
   temporal. El usuario ya puede iniciar sesión (por G2) con la nueva contraseña.

> El envío por defecto de Supabase sirve para pruebas, pero tiene **límite de
> pocos correos por hora** y puede caer en spam. Para envío confiable en
> producción, configura SMTP propio en Supabase → **Authentication → Emails →
> SMTP Settings**.

## Nota de seguridad

Los tokens se guardan en `localStorage` para que la sesión persista (es lo que el
usuario espera de un portal). El trade-off conocido es que un token en
`localStorage` es accesible por JS y por tanto vulnerable a XSS; en un backend
propio lo ideal sería una cookie `httpOnly`. Como G2 es un servicio de tokens
Bearer para todo el ecosistema, aquí se sigue el mismo patrón que el resto de los
consumidores. Está documentado en `src/session.js`.
