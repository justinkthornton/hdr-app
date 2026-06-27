# Phase 1

## Built

- TypeScript pnpm monorepo.
- Next.js admin UI.
- Local admin password auth.
- API-key middleware for `/api/v1/*`.
- Health and shoot REST endpoints.
- SQL schema migrations using plain migration files.
- `pg` database helpers and shoot repository functions.
- Auth, storage, and HDR engine adapter seams.
- Placeholder worker package.
- Docker Compose with web, one-shot migration service, Postgres, Postgres volume, and local storage volume.
- API, auth, security, MCP-style contract, Render, Phase 2, fixture, and progress docs.

## Acceptance Checklist

- [x] Repo skeleton exists.
- [x] TypeScript, linting, formatting, and tests are configured.
- [x] Docker Compose defines web, migration, and Postgres services.
- [x] SQL migrations exist.
- [x] Admin password login is implemented.
- [x] API-key middleware is implemented.
- [x] `/api/v1/health` is implemented with `x-api-key` protection.
- [x] Shoot create/list/get/update is implemented.
- [x] Basic UI exists.
- [x] README exists.
- [x] API docs exist.
- [x] Auth docs exist.
- [x] Security docs exist.
- [x] MCP-style REST contract exists.
- [x] Render-shaped docs exist.
- [x] Phase 2 preview docs exist.
- [x] Tests pass.
- [x] Phase 1 runtime smoke script exists.
- [x] Migrations have been run against local Postgres.
- [x] Docker Compose has been started and verified.
- [x] Admin login has been manually or smoke-test verified against a running app.
- [x] `/api/v1/health` has been verified against a running app.
- [x] Shoot create/list endpoints have been verified against a running app.
- [x] `docs/progress.md` is updated.

## Known Limitations

- No image upload.
- No EXIF extraction.
- No bracket grouping.
- No PhotomatixCL worker.
- No exports.
- No true MCP server.
- No Better Auth or OAuth.
- No runtime AI calls.

## Verification

Passed on 2026-06-27:

- `pnpm test`
- `pnpm lint`
- `pnpm format`
- `pnpm build`
- Static Docker setup review: Compose now waits for Postgres health, runs `pnpm db:migrate` through a one-shot `migrate` service, then starts web.
- Root runtime scripts load the ignored 1Password-mounted `.env` file without printing values.
- `scripts/smoke-phase-1.mjs` exists to verify health auth, admin login/session, API-key shoot create/list/get, and admin shoot update against a running stack.
- Admin session cookies are signed with `ADMIN_SESSION_SECRET`; `ADMIN_PASSWORD` is only used for login validation.
- Docker Compose requires `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `API_KEY` rather than falling back to local default credentials.
- Running app smoke: `GET /api/v1/health` returned `200` with a valid `x-api-key`.
- Running app smoke: `GET /api/v1/health` returned `401` without `x-api-key`.
- Running app smoke: `POST /api/admin/login` returned `200` and set an HTTP-only admin session cookie.

Resolved on 2026-06-27:

- 1Password Environment `HDR app` was located through the 1Password MCP server.
- Required variable names were present after adding an empty Phase 1 placeholder for `PHOTOMATIX_LICENSE_KEY`.
- The 1Password Environment was mounted to the ignored local `.env` path.
- `docker compose version` and `docker info` passed.
- `docker compose up --build -d` started the local stack.
- `docker compose ps -a` showed Postgres healthy, the migration service exited `0`, and web running on port `3000`.
- `pnpm db:migrate` passed against live local Docker Postgres.
- `pnpm smoke:phase1` passed against the running app and database.
- Final gates passed: `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm format`.
