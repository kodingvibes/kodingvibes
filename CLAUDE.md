# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # dev server (localhost:3000)
npm run build            # production build — the only real correctness gate
npm run lint             # next lint (eslint-config-next, core-web-vitals + typescript)
npm run security:check   # npm audit --audit-level=moderate

npm run pwa:icons        # regenerate PWA icons from source
npm run images:compress  # compress images already in Supabase storage
npm run images:rewrite   # rewrite image URLs in existing posts
```

**There is no test suite** — no runner, no spec files, no `test` script. `npm run build` plus `npm run lint` is the full verification story. Don't look for tests or claim they pass.

## Versioning

Releases are automated by semantic-release (`.github/workflows/release.yml`, config in `.releaserc.json`), triggered on push to `main`. Commits must follow Conventional Commits: `feat:` → minor, `fix:`/`perf:`/`revert:` → patch, `feat!:` or `BREAKING CHANGE:` → major, `chore:`/`docs:`/`refactor:` → no bump.

Never edit `package.json#version` or `CHANGELOG.md` by hand — the workflow owns both and commits them back with `[skip ci]`.

## Architecture

Next.js 15 App Router + React 18 + TypeScript (strict) + Tailwind, on Supabase (Postgres, Auth, Storage, Edge Functions), deployed to Vercel with `output: 'standalone'`. Path alias `@/*` → `src/*`.

### Routing and i18n are load-bearing

next-intl with 9 locales (`es` default, plus en/de/fr/it/pt/ru/zh/ja) and `localePrefix: 'always'` (`src/i18n/routing.ts`). Consequences:

- Every user-facing page lives under `src/app/[locale]/`. A page added outside it is unreachable through normal navigation.
- API routes live under `src/app/api/` and are **deliberately excluded** from the locale middleware. `src/middleware.ts` early-returns for `/_next`, `/api`, any path containing a dot, and `/auth/callback` — the OAuth callback sits at `src/app/auth/callback/route.ts`, outside `[locale]`, for exactly this reason.
- Adding a UI string means adding the key to all nine `messages/*.json` files.

`src/middleware.ts` also does IP rate limiting (100 req/60s) in a module-level `Map`. It is per-instance and resets on cold start, so it is a speed bump, not a real limit.

### Three Supabase clients, not interchangeable

- `src/lib/supabase/server.ts` — cookie-bound session for Server Components and route handlers. Respects RLS. The default choice.
- `src/lib/supabase/client.ts` — browser client. Respects RLS.
- `src/lib/supabase/admin.ts` — service-role key, **bypasses RLS entirely**. Only for bot API routes and other trusted server paths. Validates that the key looks like a JWT and throws if unconfigured.

**Mock mode:** if `NEXT_PUBLIC_SUPABASE_URL` is missing or still the placeholder, `server.ts` and `client.ts` silently return `createMockClient()` (`src/lib/supabase/mock.ts`) so the app boots without a backend. `admin.ts` throws instead. This means a misconfigured env produces empty data rather than an error — check env before debugging "why is everything empty".

### Much of the business logic is in Postgres

Permissions, vote counting, username generation, default group membership, soft deletes, and the edit-time window are implemented as RLS policies, triggers, and `SECURITY DEFINER` functions in SQL, not in TypeScript. Bot post creation goes through an RPC (`create_post_with_api_key`) rather than a table insert.

So a permissions or counting change usually belongs in a new migration under `supabase/migrations/`, not in a route handler. `supabase/schema.sql` is the from-scratch bootstrap; the timestamped files in `supabase/migrations/` are the incremental history. Migrations are applied through Supabase, not by any script in this repo.

`supabase/functions/` holds Deno edge functions (`notify-email`, `push-notification`) and is excluded from `tsconfig.json` — it does not typecheck with the app.

### Bot API

`src/app/api/bot/*` is a public write API for community bots. Keys arrive as `x-api-key` or `Authorization: Bearer` (`src/lib/bot/auth.ts`), are stored sha256-hashed in `user_api_keys`, and reads are rate-limited per key (`src/lib/bot/query.ts`). These routes use the admin client, so validation in the route handler is the only guard before RLS is bypassed.

Concretely: any `GET` here must re-implement by hand the predicate of the RLS `SELECT` policy for the table it reads, because that policy is not applied. Posts and comments must filter `is_deleted = false` and expose only published-or-own rows; votes are private per-user (`schema.sql:238-241`) and must always be scoped to the key owner. Adding a new bot read endpoint means reading the table's policy first and mirroring it.

Users manage their own keys through `src/app/api/user/api-keys/`.

### Integration with the wider KodingVibes ecosystem

- **SSO out to late.kodingvibes.com** (`src/app/api/sso/irc-token/route.ts`): mints a 5-minute HS256 JWT signed with `SSO_BRIDGE_SECRET`, issuer `kodingvibes.com`, audience `late.kodingvibes.com`. The audience and issuer must match what late-auth-service expects — a mismatch here is a silent login failure, and has already caused one.
- **Chat webhook in** (`src/app/api/chat/webhook/route.ts`): late.sh posts mention events, verified by HMAC-SHA256 in `x-chat-signature` against `CHAT_BRIDGE_WEBHOOK_SECRET`. Note `src/lib/webhook.ts` allows unsigned requests when the secret is unset and `NODE_ENV !== 'production'`.
- **NetRun card game is no longer in this repo.** `next.config.mjs` permanently redirects `/card-game` and `/:locale/card-game/*` to `https://netrun.kodingvibes.com`.

### CSP is strict and hand-maintained

`next.config.mjs` sets the full security header set including an explicit Content-Security-Policy string. Adding any third-party script, image host, iframe, or connect target requires editing that string. Remote images additionally need an entry in `images.remotePatterns`. `images.unoptimized: true` is deliberate (Vercel image-optimization quota).

## Environment

`.env.local.example` covers only the basics. The full set actually referenced in code:

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all Supabase clients, OG route, sitemap |
| `SUPABASE_SERVICE_ROLE_KEY` | admin client (bot API) |
| `NEXT_PUBLIC_SITE_URL` | auth callback, SSO redirect |
| `SSO_BRIDGE_SECRET` | IRC token signing |
| `CHAT_BRIDGE_WEBHOOK_SECRET` | inbound chat webhook HMAC |

## Repo notes

Root-level topic docs (`MODERATION_AND_BANS.md`, `ADMIN_EDIT_POSTS.md`, `GROUP_MODERATORS_MANAGEMENT.md`, `CSP_NONCE_IMPLEMENTATION.md`, `OWASP_SECURITY_REPORT.md`, and others) document individual features and their migrations. Check them before reimplementing something that looks missing.

`scripts/` mixes maintenance tooling (`compress-existing-images.js`, `generate-pwa-icons.js`) with one-off Python card-art generators left over from NetRun. The Python files are dead weight relative to the current app.

User-facing copy and error messages are in Spanish. Match that in anything users will read.
