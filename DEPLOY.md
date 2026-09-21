# Desplegar a producción

## Estado actual

Hay **dos mecanismos** que pueden crear deployments. Se solapan a propósito:

| Mecanismo | Qué hace | Puerta de calidad |
|---|---|---|
| **Integración Git de Vercel** | Deploy automático en cada push a `main`, y un *preview* por PR | el propio build de Vercel |
| **Workflow `Deploy`** (`.github/workflows/deploy.yml`) | `vercel pull/build/deploy` tras un CI verde en `main` | `CI` (lint + build) |

## La integración Git estuvo caída 2 meses

Entre el **20-jul-2026** y el **21-sep-2026** Vercel no creó ningún deployment desde
Git, mientras `main` recibía 29 commits: el sitio quedó congelado en el estado de
julio. Nada lo detectó porque **nada en CI desplegaba**.

**Causa raíz:** el repositorio se transfirió a la organización `kodingvibes`, pero la
GitHub App de Vercel seguía instalada en la cuenta personal `madkoding`. Vercel
guardaba `org: "madkoding"` y `sourceless: true` — ya no podía leer el repo.

**Solución:** instalar la GitHub App en la organización
(<https://github.com/apps/vercel> → *Install* → elegir **`kodingvibes`**) y reconectar:

```bash
vercel git connect git@github.com:kodingvibes/kodingvibes.git
```

Queda bien cuando `link` muestra la organización y **no** aparece `sourceless`:

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/kodingvibes?teamId=madkodings-projects" \
  | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin)["link"], indent=1))'
# org: kodingvibes, repoOwnerId: 308510421 (la org), sin la clave sourceless
```

> **Cuidado al reconectar:** `vercel git connect` (y `POST /v9/projects/{id}/link`)
> **borran el link existente antes** de intentar crear el nuevo. Si la App no está
> instalada, el intento falla y el proyecto queda con `link: null` — peor que antes.
> Comprueba el estado después de cualquier intento.

## Cómo se comprueba si el deploy está vivo

```bash
# De dónde vino cada deployment: "git" = integración, "cli" = alguien a mano
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=prj_8cEIvpSduwOkiP7zRvsCP0WtfngM&teamId=madkodings-projects&limit=10" \
  | python3 -c 'import json,sys; [print(d["createdAt"], d.get("source")) for d in json.load(sys.stdin)["deployments"]]'
```

Una racha de `cli` significa que la integración no está disparando. `git` significa
que sí.

## El workflow `Deploy`

Se añadió **mientras la integración estaba caída**, para que el deploy no dependiera
de un interruptor del panel que nadie mira. Sigue siendo útil: es el único camino que
**exige un CI verde** antes de publicar.

```
push a main
   └─ CI (ci.yml)              lint + build                    ← compuerta
        └─ Deploy (deploy.yml) vercel pull/build/deploy        ← publicación
```

- **Solo despliega si CI pasó** (`workflow_run` con `conclusion == 'success'`).
- **Despliega el commit exacto que CI validó** (`head_sha`), no el `main` del momento.
- **`concurrency: deploy-production` sin `cancel-in-progress`**: dos deploys no se pisan.
- **`vercel pull`** trae del panel las variables de entorno, así que el build de CI ve
  los mismos `NEXT_PUBLIC_*` que un deploy del dashboard.
- Sin los secretos, el job termina **en verde** con un aviso `Skipping deploy`. Es
  deliberado: un `if` a nivel de job no puede leer el contexto `secrets`, así que la
  comprobación es un step del que dependen los demás.

Secretos necesarios (ya configurados): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

### Si quieres volver a un solo mecanismo

Para dejar **solo la integración Git** (y perder la compuerta de CI):

```bash
gh workflow disable deploy.yml --repo kodingvibes/kodingvibes
```

Para dejar **solo el workflow** (y perder los previews por PR), desactiva los deploys
automáticos desde el panel: *Project → Settings → Git → Ignored Build Step*.

## Cómo funciona el workflow

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
| Deploy verde pero el sitio no cambia | Revisa que el dominio apunte al proyecto correcto (*Settings → Domains*) |
| Dos deployments por push | Los dos mecanismos están activos. Ver «Si quieres volver a un solo mecanismo» |
| Deployment con error `ERR_REQUIRE_ESM` | Una dependencia ESM pura cargada con `require()`. Vercel no habilita `require(esm)`. Reprodúcelo con `node --no-experimental-require-module -e "require('paquete')"` y fija con `overrides` una versión cuya cadena sea CommonJS |
