# Progress

## 2026-06-27

- Created Phase 1 pnpm TypeScript monorepo scaffold.
- Added Next.js admin app, shared core package, and placeholder worker package.
- Added plain SQL migration for shoots, upload batches, assets, bracket groups, jobs, exports, job events, and API keys.
- Added local admin password auth and API-key middleware.
- Added Phase 1 health and shoot API contracts.
- Added basic admin UI for login, dashboard, shoot creation, shoot listing, and shoot detail placeholder.
- Added Docker Compose, Render-shaped config, env template, docs, and tests.
- Verified `pnpm test`, `pnpm lint`, `pnpm format`, and `pnpm build`.
- Smoke-tested running app health API and admin login.
- Documented runtime blocker: Docker, Postgres CLI tools, and local Postgres were unavailable, so migrations and database-backed shoot endpoint smoke checks could not pass locally.
- Tightened Docker local runtime: added `.dockerignore`, added one-shot `migrate` service, and made Docker Compose start web only after migrations complete.
- Added `pnpm smoke:phase1` to validate the full Phase 1 runtime surface once Docker/Postgres are available.
- Added a local env runner so root runtime scripts can consume the ignored 1Password-mounted `.env` file without printing or committing secret values.
- Completed Phase 1 runtime validation with the 1Password Environment `HDR app`: Docker Compose started web/Postgres, migrations passed, the Phase 1 smoke test passed, and final test/lint/build/format gates passed.
- Hardened Phase 1 before Phase 2: removed Docker Compose fallback admin/API credentials, added required `ADMIN_SESSION_SECRET`, and separated admin password login validation from admin session cookie signing.
- Added `ADMIN_SESSION_SECRET` to the 1Password Environment `HDR app` and confirmed the mounted ignored `.env` exposes required auth variable names without printing values.
- Added explicit Next proxy tests for valid, missing, and invalid `x-api-key` handling on `/api/v1/*`.
- Added `docs/security.md` covering ignored env files, 1Password local secrets, private-repo expectations, and items that must not be committed.
- Rebuilt the Docker Compose stack after hardening: Postgres was healthy, `migrate` exited `0`, and `web` ran on port `3000`.
- Hardening checks passed: `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm format`, `pnpm db:migrate`, and `pnpm smoke:phase1`.
