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
- API, auth, MCP-style contract, Render, Phase 2, fixture, and progress docs.

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
- [x] MCP-style REST contract exists.
- [x] Render-shaped docs exist.
- [x] Phase 2 preview docs exist.
- [x] Tests pass.
- [x] Phase 1 runtime smoke script exists.
- [ ] Migrations have been run against local Postgres.
- [ ] Docker Compose has been started and verified.
- [x] Admin login has been manually or smoke-test verified against a running app.
- [x] `/api/v1/health` has been verified against a running app.
- [ ] Shoot create/list endpoints have been verified against a running app.
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
- `scripts/smoke-phase-1.mjs` exists to verify health auth, admin login/session, API-key shoot create/list/get, and admin shoot update against a running stack.
- Running app smoke: `GET /api/v1/health` returned `200` with a valid `x-api-key`.
- Running app smoke: `GET /api/v1/health` returned `401` without `x-api-key`.
- Running app smoke: `POST /api/admin/login` returned `200` and set an HTTP-only admin session cookie.

Blocked on 2026-06-27:

- `docker` and `docker compose` were not available from this environment.
- `psql` and `pg_isready` were not available from this environment.
- `pnpm db:migrate` reached the database connection path, then failed with `ECONNREFUSED` for `127.0.0.1:5432` and `::1:5432`.
- Running app smoke for `GET /api/v1/shoots` and `POST /api/v1/shoots` returned `500` because Postgres was not reachable.
- `pnpm smoke:phase1` could not be completed in this environment because it requires a running app backed by reachable Postgres.
