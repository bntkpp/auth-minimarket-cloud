# CI/CD — Identity Service (G2)

> Evidencia del **entregable 4** (E3 Cloud): pipeline de integración y
> despliegue continuo con GitHub Actions + Render.

## 1. ¿Qué es CI/CD y por qué lo usamos?

**CI (Integración Continua)**: cada vez que alguien sube código al repo,
GitHub ejecuta automáticamente verificaciones (tipos de TypeScript y
compilación). Los errores se detectan *antes* de llegar a producción.

**CD (Despliegue Continuo)**: si las verificaciones pasan, el pipeline le
ordena a Render publicar la nueva versión. Nadie despliega a mano y nunca se
despliega código roto.

**Smoke test**: tras el deploy, el pipeline ejecuta las pruebas de contrato
de Postman (carpeta *Auth*) contra la URL pública para confirmar que el
servicio vivo responde según el contrato.

## 2. Arquitectura del pipeline

```
push a main ──► JOB ci ──────► JOB deploy ─────► JOB smoke
                typecheck       POST al Deploy    espera /health
                + build         Hook de Render    + newman (Postman)
                   │
Pull Request ──────┘  (solo verifica, NO despliega)
```

Reglas clave (definidas en [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)):

- `needs:` encadena los jobs: si `ci` falla, no hay deploy; si `deploy`
  falla, no hay smoke test.
- El deploy solo ocurre en **push a `main`**; los Pull Requests solo se
  verifican.
- `render.yaml` tiene `autoDeploy: false`: Render ya no despliega solo con
  cada push; obedece únicamente al pipeline.

## 3. Configuración (una sola vez)

### 3.1 Render

1. Servicio creado desde el blueprint `render.yaml` (New + → Blueprint).
2. En **Environment**, cargar a mano `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` (el blueprint los declara con `sync: false`
   para que nunca queden en el repo).
3. En **Settings → Deploy Hook**, copiar la URL del hook.

### 3.2 GitHub (repo → Settings)

| Dónde | Nombre | Valor |
|---|---|---|
| Secrets and variables → Actions → **Secrets** | `RENDER_DEPLOY_HOOK_URL` | URL del Deploy Hook de Render |
| Secrets and variables → Actions → **Variables** | `SERVICE_URL` | URL pública del servicio, ej. `https://identity-service-g2.onrender.com` (sin `/` final) |

> El hook va en *Secrets* porque quien lo tenga puede disparar deploys; la
> URL pública va en *Variables* porque no es sensible y así se lee en los
> logs del pipeline.

### 3.3 Requisito del smoke test

La carpeta *Auth* de la colección Postman hace login con los usuarios
`juan@correo.cl` y `maria@correo.cl`; deben existir en el Supabase de
producción (registro aleatorio, el resto de casos no dependen de datos).

## 4. Evidencia para la rúbrica

- Archivo del pipeline: `.github/workflows/ci-cd.yml` (en el repo).
- Ejecuciones: pestaña **Actions** del repo — capturar un run verde con los
  3 jobs encadenados y, idealmente, un run rojo de un PR con error (muestra
  que la puerta de calidad funciona).
- Deploy: dashboard de Render → **Events**, donde el deploy aparece
  disparado "via Deploy Hook" con fecha/hora coincidente con el run.
- Smoke test: log del job *Smoke test* con el reporte de newman
  (aserciones pasadas contra la URL pública). Sirve además como evidencia
  del entregable 5 (pruebas funcionales).
