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
