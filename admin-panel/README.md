# Panel de Administración de Usuarios (G2)

Panel web (React + Vite) para **gestionar usuarios** del servicio de Identidad
(Grupo 2): ver, crear, editar, cambiar rol/estado y eliminar. Consume
**directamente la API de G2** (no pasa por el BFF de G1, que no expone gestión
de usuarios).

## Funcionalidades

- **Login de admin** (solo cuentas con rol `admin` pueden entrar).
- **Listado** de usuarios con filtros por rol y estado + paginación.
- **Crear** usuario (con rol customer o admin).
- **Editar** nombre y rol.
- **Activar / deshabilitar** cuentas.
- **Eliminar** usuarios.

## Requisitos previos: necesitas un usuario admin

El registro (`/auth/register`) crea usuarios `customer`. Para tener el **primer
admin** (y poder entrar al panel), promové una cuenta en el dashboard de Supabase:

**Supabase → Authentication → Users →** abrí un usuario **→ User Metadata**, agregá:
```json
{ "role": "admin" }
```
Guardá y logueate en el panel con esa cuenta. Desde ahí ya podés gestionar todo
(incluido promover a otros a admin) sin volver a Supabase.

## Correr en local

```bash
npm install
npm run dev
```
Abre el link que muestra Vite (por defecto `http://localhost:5173`).

Por defecto apunta al G2 desplegado. Para cambiar la URL, crea un `.env`:
```bash
VITE_API_URL=https://auth-minimarket-cloud.onrender.com
```

## Deploy en Vercel

1. Subir esta carpeta a un repo (o el subdirectorio `admin-panel/`).
2. En Vercel: **New Project** → importar el repo.
   - Si el panel está en un subdirectorio, en **Root Directory** poné `admin-panel`.
   - Framework: **Vite** (lo detecta solo). Build: `npm run build`. Output: `dist`.
3. En **Settings → Environment Variables** agregá `VITE_API_URL` con la URL de G2.
4. Deploy. Vercel te da la URL pública del panel.

> G2 tiene CORS abierto, así que el panel desplegado en Vercel puede llamarlo
> sin configuración extra.

## Estructura

```
admin-panel/
├── index.html
├── vite.config.js
├── .env.example              # VITE_API_URL
└── src/
    ├── main.jsx
    ├── App.jsx               # decide Login vs Dashboard según sesión
    ├── api.js                # cliente de la API de G2 (fetch + token)
    ├── styles.css
    └── components/
        ├── Login.jsx
        ├── Dashboard.jsx     # tabla + filtros + acciones + paginación
        └── UserModal.jsx     # crear / editar
```

## Endpoints de G2 que usa

| Acción | Método | Ruta |
|--------|--------|------|
| Login | POST | `/auth/login` |
| Mi perfil (verificar admin) | GET | `/users/me` |
| Listar usuarios | GET | `/users?role=&status=&page=&limit=` |
| Crear usuario | POST | `/auth/register` |
| Editar nombre | PATCH | `/users/{id}` |
| Cambiar rol | PATCH | `/users/{id}/role` |
| Cambiar estado | PATCH | `/users/{id}/status` |
| Eliminar | DELETE | `/users/{id}` |
