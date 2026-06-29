# Structure-Locked HDR Service

Internal real estate HDR processing service foundation. Phase 2A adds local batch upload, JPEG metadata extraction, JPEG thumbnails, EXIF/exposure-aware bracket grouping, and review/approval UI. Phase 2B adds the safe HDR engine seam and worker smoke path for PhotomatixCL validation. Phase 2C wires approved bracket groups into local HDR jobs, runs the fake engine, and creates downloadable placeholder export records. Phase 2D prepares staged real PhotomatixCL smoke validation and opt-in Photomatix job processing while keeping fake mode as the safe default.

## Stack

- pnpm workspace for a small TypeScript monorepo.
- Next.js, React, and TypeScript in `apps/web`.
- Shared contracts, validation, auth helpers, database helpers, local storage, metadata extraction, JPEG thumbnail generation, bracket grouping, job/export repositories, and adapter seams in `packages/core`.
- Worker smoke package in `packages/worker`.
- Postgres via `pg`.
- SQL migration files in `db/migrations`.
- Docker Compose for local web and Postgres runtime.

pnpm is used because it is fast, workspace-native, and keeps the Phase 1 monorepo simple without adding a task runner.

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy the env template:

```bash
cp .env.example .env
```

3. Set local-only values in `.env`:

```bash
DATABASE_URL=postgres://hdr:hdr@localhost:5432/structure_locked_hdr
ADMIN_PASSWORD=replace-with-admin-password
ADMIN_SESSION_SECRET=replace-with-a-random-session-secret-32-chars-min
API_KEY=replace-with-api-key
STORAGE_DRIVER=local
LOCAL_STORAGE_ROOT=/data/storage
MAX_UPLOAD_FILES=30
MAX_UPLOAD_FILE_BYTES=104857600
MAX_UPLOAD_BATCH_BYTES=524288000
HDR_ENGINE_MODE=fake
PHOTOMATIXCL_PATH=
PHOTOMATIX_LICENSE_KEY=
```

`ADMIN_PASSWORD` is only for login validation. `ADMIN_SESSION_SECRET` signs the admin session cookie and must be a separate secret. `MAX_UPLOAD_FILES` defaults to 30, `MAX_UPLOAD_FILE_BYTES` defaults to 100 MiB, and `MAX_UPLOAD_BATCH_BYTES` defaults to 500 MiB for local-use upload safety. `HDR_ENGINE_MODE` defaults to `fake`. `PHOTOMATIXCL_PATH` is only needed for real PhotomatixCL smoke runs. `PHOTOMATIX_LICENSE_KEY` may be empty for trial mode and must never be logged.

## Docker Compose

Start the local stack:

```bash
docker compose up --build
```

The Compose file defines:

- `web`: Next.js development service.
- `migrate`: one-shot SQL migration service that runs after Postgres is healthy and before `web` starts.
- `postgres`: Postgres service.
- `hdr-worker`: Phase 2B worker smoke service behind the `worker` profile.
- `postgres_data`: named Postgres volume.
- `local_storage`: named volume for uploaded originals, thumbnails, staged files, and fake export placeholders.

The stack is configured for Apple Silicon with `linux/arm64` images.

`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `API_KEY` are required by Compose. The stack should fail to start if any of them are missing.

Run the fake worker smoke in Docker without changing normal app startup:

```bash
docker compose --profile worker run --rm hdr-worker pnpm worker:smoke:fake
```

The worker image includes the runtime libraries PhotomatixCL needed during local trial validation: `liblensfun1`, `libcurl3-gnutls`, `libgomp1`, `libjpeg62-turbo`, `libtiff6`, and `liblcms2-2`.

Run the real Photomatix smoke only after mounting an ignored Linux ARM extraction at `local-photomatixcl/PhotomatixCL/` and setting `PHOTOMATIXCL_PATH=/opt/photomatixcl-local/PhotomatixCL/PhotomatixCL`:

```bash
docker compose --profile worker run --rm hdr-worker pnpm worker:smoke:photomatix
```

## Database

Run migrations against the configured `DATABASE_URL`:

```bash
pnpm db:migrate
```

The root `db:migrate` script loads values from the ignored local `.env` file when it exists. When using Docker Compose, migrations also run automatically through the `migrate` service before the web service starts.

Reset the local database only when you intentionally want to drop local data:

```bash
CONFIRM_DB_RESET=structure-locked-hdr-service pnpm db:reset
```

## Development

```bash
pnpm dev
```

Open `http://localhost:3000`, sign in with `ADMIN_PASSWORD`, and create/list shoots from the dashboard.

## Phase 1 Smoke Test

After the app and Postgres are running and migrations have completed, validate the Phase 1 runtime surface:

```bash
pnpm smoke:phase1
```

Set `BASE_URL` if the app is not running at `http://localhost:3000`.

The root `smoke:phase1` script loads `API_KEY`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` from the ignored local `.env` file when it exists.

The smoke test checks:

- `/api/v1/health` accepts a valid API key and rejects a missing key.
- Admin login sets an HTTP-only session cookie.
- Admin session reads back as authenticated.
- API-key shoot create/list/get works.
- Admin shoot update works.

## Checks

```bash
pnpm test
pnpm lint
pnpm build
pnpm format
pnpm db:migrate
pnpm smoke:phase1
pnpm worker:smoke:fake
```

Phase 2C/2D local validation also uses the running app to approve a bracket group, process it with fake mode or opt-in PhotomatixCL, and download generated exports.

## Phase 2A Scope

Included:

- Repo and TypeScript workspace foundation.
- SQL schema for Phase 1 and Phase 2-facing entities.
- Local admin password auth for UI routes.
- API-key auth for `/api/v1/*`.
- REST endpoints for health and shoots.
- Batch upload UI on shoot detail pages.
- LocalVolumeStorage-backed original file storage.
- Admin and API-key upload endpoints.
- Env-backed upload limits with pre-write 400 errors for too many files, oversized files, and oversized batches.
- JPEG metadata extraction with RAW/TIFF partial-storage support.
- Local JPEG thumbnail generation and admin-protected thumbnail previews.
- Exposure-aware deterministic 7-shot, 3-shot, and ambiguous bracket grouping.
- Asset and bracket group review UI with explicit workflow steps, upload summaries, visual previews, diagnostics, and approve/reject actions.
- Admin and API-key endpoints for listing assets/groups and approving/rejecting groups.
- Adapter seams for future auth, storage, HDR engine, and worker work.
- Documentation for API, auth, security, Phase 2A, Render shape, MCP-style REST contract, and Phase 2 preview.

Not included:

- PhotomatixCL worker.
- Export generation.
- HDR job creation.
- Reruns.
- Manual drag-and-drop sorting.
- Better Auth, OAuth, true MCP server, or runtime AI calls.

## Phase 2B Scope

Included:

- `FakeHdrEngine` for deterministic worker smoke tests.
- `PhotomatixCliEngine` with redacted command, stdout, stderr, timeout, and license-loading behavior.
- `pnpm worker:smoke:fake` and `pnpm worker:smoke:photomatix`.
- Profiled `hdr-worker` Docker Compose service for Apple Silicon Linux ARM worker validation.
- Optional/manual PhotomatixCL setup docs and local fixture policy.

Not included:

- automatic HDR jobs from approved groups
- export records or download UI
- reruns
- full queue orchestration
- committed PhotomatixCL binaries, real photos, generated outputs, or license keys

## Phase 2C Scope

Included:

- `hdr_jobs.engine_mode` migration plus job/export repository helpers.
- Admin endpoints for listing, creating, processing, and downloading HDR jobs/exports.
- `/api/v1` API-key equivalents for Hermes-style REST access.
- Approved-group-only job creation.
- Process-now fake engine path for local MVP validation.
- Stored fake export text files with explicit placeholder wording.
- Safe API responses that omit storage keys, local filesystem roots, raw secrets, and generated output paths.
- Shoot detail UI controls for fake HDR processing and export downloads.

Not included:

- full background queue orchestration
- reruns
- production object storage
- Better Auth, OAuth, true MCP, runtime AI, commercial billing, or deployment
- real PhotomatixCL acceptance
- committed real photos, generated HDR outputs, Photomatix binaries, or license keys

## Phase 2D Scope

Included:

- staged Photomatix smoke receipts for binary, startup, license, fixture, and render checks.
- redacted smoke output that avoids raw secrets, home paths, storage roots, fixture roots, and binary paths.
- automatic Photomatix trial-mode rendering with `-trial` when no license key is configured.
- opt-in PhotomatixCL choice in the local job UI.
- Photomatix output import into existing export records when a real output file is produced.
- tests that simulate Photomatix output without requiring the real binary.

Not included:

- making PhotomatixCL mandatory
- committing PhotomatixCL binaries, real photos, generated HDR outputs, or license keys
- separate MLS resizing/full-size variants
- background queue orchestration or reruns

## Phase 2 Preview

Later Phase 2 work will add output sizing, reruns, job queue orchestration, and broader RAW fixture validation after real PhotomatixCL is locally supplied and validated.
