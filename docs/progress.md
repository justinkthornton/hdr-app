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
- Built Phase 2A upload and review flow: `LocalVolumeStorage`, JPEG metadata extraction, RAW/TIFF partial-storage handling, deterministic bracket grouping, admin upload/review UI, admin endpoints, and `/api/v1` asset/group review endpoints.
- Added Phase 2A tests for storage path safety, filename sanitization, JPEG metadata extraction, RAW partial metadata behavior, clean 7-shot grouping, clean 3-shot grouping, mixed groups, missing capture time, mixed camera models, extra files, upload handler behavior, review handlers, and API-key proxy protection.
- Updated Phase 2A docs and fixture guidance: `docs/phase-2a.md`, API docs, MCP-style REST contract, Phase 2 preview, README, and fixture README files.
- Verified Phase 2A static gates: `pnpm test` passed 12 files / 40 tests, `pnpm lint` passed, `pnpm build` passed, and `pnpm format` passed.
- Verified Phase 2A runtime gates: `pnpm db:migrate` reported no migrations to apply, `docker compose up --build -d` rebuilt and started the stack, and `docker compose ps -a` showed Postgres healthy, `migrate` exited `0`, and `web` running on port `3000`.
- Live synthetic JPEG validation passed against the running app: login, create shoot, upload 3 generated JPEGs, list assets, list bracket groups, approve group, reject group, and API-key list groups all succeeded. Real non-client JPEG bracket fixture validation remains pending until fixtures are supplied.
- Re-ran `pnpm smoke:phase1`; Phase 1 smoke still passed after Phase 2A changes.
- Hardened Phase 2A before PhotomatixCL work: grouping now accounts for previous exposure duration, upload limits are env-backed with pre-write 400 errors, storage objects written during failed uploads are cleaned up best-effort, and `/api/v1` asset responses omit internal storage keys and raw metadata.
- Added hardening tests for exposure parsing, long-exposure 3-shot and 7-shot grouping, large post-exposure gaps, missing exposure fallback, upload limit rejection, failed upload storage cleanup, env limit validation, and sanitized API-key asset responses.
- Documented remaining fixture gap: real local 7-shot and 3-shot JPEG bracket validation is still pending until non-client fixtures are supplied.
- Verified Phase 2A hardening checks: `pnpm test` passed 12 files / 52 tests, `pnpm lint` passed, `pnpm build` passed, `pnpm format` passed, `pnpm db:migrate` reported no pending migrations, `docker compose up --build -d` rebuilt and started the stack, `docker compose ps -a` showed Postgres healthy, migrate exited `0`, and web running on port `3000`, and `pnpm smoke:phase1` passed.
- Improved the Phase 2A user experience before PhotomatixCL work: dashboard shoot cards now look actionable, test/smoke shoots are labeled and sorted lower, shoot detail shows explicit workflow steps, upload copy explains automatic grouping, upload results summarize detected 3-shot/7-shot groups, and group cards show plain-language status, counts, confidence, thumbnails/placeholders, diagnostics, and approve/reject actions.
- Added local JPEG thumbnail generation with `sharp`, safe thumbnail storage keys, a nullable `assets.thumbnail_storage_key`, an admin-protected thumbnail route, and `/api/v1` hygiene that omits thumbnail URLs alongside internal storage keys and raw metadata.
- Verified Phase 2A UX checks: `pnpm test` passed 14 files / 59 tests, `pnpm lint` passed, `pnpm build` passed, `pnpm format` passed, `pnpm db:migrate` applied `002_phase_2a_thumbnails.sql` and a final migration check reported no pending migrations, `docker compose up --build -d` rebuilt and started the stack, `docker ps` showed `hdrapp-web-1` running on port `3000` and `hdrapp-postgres-1` healthy, and `pnpm smoke:phase1` passed. `docker compose ps -a` hung in the local shell after rebuild, so `docker ps` was used as the non-hanging container readback.
- Synthetic local runtime validation passed on a temporary dev server with throwaway credentials: a mixed 10-JPEG upload produced one 3-shot group and one 7-shot group, every JPEG asset returned a protected thumbnail URL, the thumbnail endpoint returned `200 image/jpeg`, and approve/reject persisted. Real non-client photo fixture validation remains pending.

## 2026-06-28

- Addressed Phase 2A review feedback from the running local app: create-shoot form rows no longer stretch apart on tall dashboards, missing legacy thumbnail files fall back to file-type placeholders instead of broken image icons, the local upload default now allows 30 files per batch so three 7-shot brackets fit in one upload, and approve/reject copy now clarifies that Phase 2A only records review status and does not start HDR processing.
- Built Phase 2B Photomatix worker spike: added `FakeHdrEngine`, `PhotomatixCliEngine`, redacted command/output handling, timeout and missing-binary results, root worker smoke commands, a profiled `hdr-worker` Docker service, optional PhotomatixCL install helper, local fixture/output ignore rules, and Phase 2B/PhotomatixCL docs.
- Verified Phase 2B checks: `pnpm test` passed 16 files / 67 tests, `pnpm lint` passed, `pnpm build` passed, `pnpm format` passed, `pnpm db:migrate` reported no pending migrations, `docker compose up --build -d` rebuilt and started the normal app stack, `docker compose ps -a` showed Postgres healthy, migrate exited `0`, and web running on port `3000`, `pnpm smoke:phase1` passed with the local test API key, `pnpm worker:smoke:fake` passed, and `docker compose --profile worker run --rm hdr-worker pnpm worker:smoke:fake` passed.
- PhotomatixCL real smoke remains blocked/manual: both host and Docker `worker:smoke:photomatix` return the explicit blocker `PHOTOMATIXCL_PATH is not set`; no license key, PhotomatixCL binary, real bracket fixture, or generated HDR output was used or committed.
- Built Phase 2C local fake HDR job/export workflow: approved bracket groups can create `hdr_jobs`, process immediately through `FakeHdrEngine`, create fake placeholder export files and `exports` rows, and show job status plus download links in the shoot detail UI.
- Added `hdr_jobs.engine_mode`, job/export repository helpers, admin job/export endpoints, `/api/v1` API-key equivalents, safe download handling, and response serialization that omits storage keys, local storage roots, raw engine output paths, and secrets.
- Kept PhotomatixCL optional behind the Phase 2B engine seam: fake mode remains the acceptance path, while missing `PHOTOMATIXCL_PATH` marks Photomatix jobs failed with a structured error.
- Verified Phase 2C checks: `pnpm test` passed 18 files / 76 tests, `pnpm lint` passed, `pnpm build` passed with one non-fatal Turbopack trace warning for the server-only HDR engine import, `pnpm format` passed, `pnpm db:migrate` applied `003_phase_2c_jobs_exports.sql`, `docker compose up --build -d` rebuilt and started the stack, `docker compose ps -a` showed Postgres healthy, migrate exited `0`, and web running on port `3000`, `pnpm smoke:phase1` passed, and `pnpm worker:smoke:fake` passed after rerunning outside the sandbox for `tsx` IPC permissions.
- Live Phase 2C fixture validation passed against the running app with the ignored local 3-shot JPEG fixture: upload detected one 3-shot group, approve succeeded, fake HDR processing succeeded, two placeholder exports were created, one placeholder downloaded and included the not-real-HDR wording, and the `/api/v1` job response did not expose storage keys or the local storage root.
- Optional `pnpm worker:smoke:photomatix` remains blocked/manual as expected because `PHOTOMATIXCL_PATH` is not set; no Photomatix binary, license key, real HDR output, or raw secret value was used or committed.
