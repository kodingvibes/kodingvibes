# Desplegar a producción

## El problema

La integración Git de Vercel dejó de disparar deploys el **20-jul-2026**. Desde
entonces `main` recibió 29 commits y ningún deployment se creó, así que el sitio
quedó congelado en el estado de julio aunque el repositorio siguiera avanzando.

Se puede comprobar en cualquier momento:

```bash
# Último deployment de Vercel (creador esperado: vercel[bot])
gh api repos/kodingvibes/kodingvibes/deployments --jq '.[0] | "\(.created_at) \(.sha[0:8])"'

# ¿Vercel reporta estado en los commits recientes?
gh api repos/kodingvibes/kodingvibes/commits/main/status --jq '.statuses | length'
# 0 en los commits posteriores al corte = la integración no ve los pushes
```

`AGENTS.md` ya contemplaba la solución: *"the app is deployed to Vercel from the
`kodingvibes` project; releases here are independent of Vercel deploys unless the
workflow is extended to trigger them"*. `.github/workflows/deploy.yml` es esa
extensión.

## Configuración (una sola vez)

El workflow **no hace nada hasta que existan los tres secretos**, así que
fusionarlo no puede romper nada. Sin ellos, el job termina en verde con un aviso
`Skipping deploy — missing repository secret(s)`.

### 1. Crear el token

<https://vercel.com/account/tokens> → *Create Token*.
- **Scope:** la cuenta u organización dueña del proyecto `kodingvibes`.
- **Expiration:** lo que prefieras; al caducar, el deploy falla con un aviso claro.

### 2. Obtener los dos IDs

En el panel de Vercel:

| Secreto | Dónde |
|---|---|
| `VERCEL_ORG_ID` | Team/Account **Settings → General → Team ID** |
| `VERCEL_PROJECT_ID` | Proyecto `kodingvibes` → **Settings → General → Project ID** |

O desde un checkout ya vinculado a Vercel:

```bash
cat .vercel/project.json     # -> { "orgId": "...", "projectId": "..." }
```

### 3. Añadirlos en GitHub

**Settings → Secrets and variables → Actions → New repository secret**

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### 4. Desplegar

**Actions → Deploy → Run workflow**.

Hace falta el disparo manual la primera vez: el workflow reacciona a que **CI**
termine, y `workflow_run` solo se activa con una ejecución nueva de CI. Después
del primer despliegue, cada push a `main` con CI en verde despliega solo.

## Cómo funciona

```
push a main
   └─ CI (ci.yml)              lint + build            ← compuerta
        └─ Deploy (deploy.yml) vercel pull/build/deploy ← publicación
```

- **Solo despliega si CI pasó.** El `workflow_run` exige `conclusion == 'success'`,
  así que un build roto nunca llega a producción.
- **Despliega el commit exacto que CI validó** (`head_sha`), no el `main` del
  momento en que arranca el job. Si entran dos pushes seguidos, cada uno despliega
  su propio commit y el último gana.
- **`concurrency: deploy-production` sin `cancel-in-progress`**, para que dos
  deploys de producción nunca se pisen.
- **`vercel pull`** trae del panel las variables de entorno y la configuración del
  proyecto, así que el build de CI ve los mismos `NEXT_PUBLIC_*` que un deploy
  hecho desde el dashboard.

## Verificar un despliegue

```bash
# ¿Producción sirve ya el código nuevo? El buildId debe cambiar.
curl -sSL https://www.kodingvibes.com/es | grep -oE '"buildId":"[^"]+"'

# ¿Sigue el marcador de render en cliente? Debe estar ausente en las páginas
# publicas: era la causa de que los navegadores sin JS vieran un documento vacio.
curl -sSL https://www.kodingvibes.com/es | grep -c 'BAILOUT_TO_CLIENT_SIDE_RENDERING'
# 0 = correcto
```

Para comprobar que el contenido llega sin JavaScript (navegadores de terminal,
motores antiguos, crawlers):

```bash
docker run --rm --network host --platform linux/386 i386/alpine:latest \
  sh -c 'apk add --no-cache links; links -dump https://www.kodingvibes.com/es'
```

## Si el deploy falla

| Síntoma | Causa |
|---|---|
| `Skipping deploy — missing repository secret(s)` | Falta algún secreto del paso 3 |
| `Invalid token` / `401` | Token caducado, revocado o de otra cuenta |
| `Project not found` | `VERCEL_PROJECT_ID` no corresponde a `kodingvibes`, o el token no tiene acceso a esa organización |
| El workflow no se dispara nunca | `workflow_run` solo salta con una ejecución **nueva** de CI; usa el disparo manual |
| Deploy verde pero el sitio no cambia | Revisa que el dominio apunte al proyecto correcto (Vercel → proyecto → Settings → Domains) |
