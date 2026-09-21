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

## `npm warn allow-scripts` en el build de Vercel

Al instalar dependencias, Vercel imprime:

```
npm warn allow-scripts 4 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   @parcel/watcher@2.6.0 (install: node-gyp rebuild)
npm warn allow-scripts   @swc/core@1.15.46 (postinstall: node postinstall.js)
npm warn allow-scripts   sharp@0.34.5 (install: node install/check.js || npm run build)
npm warn allow-scripts   unrs-resolver@1.12.2 (postinstall: node postinstall.js)
```

**No es un error y el build no está degradado.** Es el aviso de migración de npm
hacia scripts de instalación opcionales: **npm 12** (8-jul-2026) los bloquea por
defecto y solo avisa, mientras que **npm 11.16+** —el que usa hoy el builder de
Vercel— avisa sin bloquear. El mismo `npm ci` imprime textos distintos según la
versión (`npm warn allow-scripts` en 11, `npm warn install-scripts` en 12).

Los cuatro paquetes traen **binarios precompilados** por plataforma
(`optionalDependencies`: `@img/sharp-linux-x64`, `@parcel/watcher-linux-x64-glibc`,
`@swc/core-linux-x64-*`, `@unrs/resolver-binding-linux-x64-gnu`). Sus scripts solo
compilan desde fuente como respaldo, así que ejecutarlos no aporta nada aquí —
salvo cuatro puntos de ejecución de código arbitrario en CI y en Vercel.

Por eso `package.json` los **deniega explícitamente**:

```json
"allowScripts": {
  "@parcel/watcher": false,
  "@swc/core": false,
  "sharp": false,
  "unrs-resolver": false
}
```

Comprobado con todo bloqueado: `next build` termina con `EXIT=0`, `sharp` hace un
`resize` real (`libvips 8.17.3` → PNG), y `@parcel/watcher` y `unrs-resolver`
cargan. **No conviertas esos `false` en `true`**: un `false` significa «revisado, su
script no hace falta»; ausente significa «sin revisar». Si aparece un paquete nuevo
en el aviso, añádelo al campo —`true` solo si de verdad necesita ejecutar su script—
y consulta los pendientes con `npm install-scripts ls`.

Si en el futuro el aviso nombra un paquete que **sí** necesita su script (uno sin
binarios precompilados, p. ej. con `binding.gyp` y sin `optionalDependencies`), la
solución es aprobarlo con `true`, no desactivar la política.

