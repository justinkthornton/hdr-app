# Structure-Locked HDR Service

Internal real estate HDR processing service foundation. Phase 2A adds local batch upload, JPEG metadata extraction, EXIF-time bracket grouping, and review/approval UI. PhotomatixCL processing, worker execution, reruns, and exports are still intentionally deferred.

## Stack

- pnpm workspace for a small TypeScript monorepo.
- Next.js, React, and TypeScript in `apps/web`.
- Shared contracts, validation, auth helpers, database helpers, local storage, metadata extraction, bracket grouping, and future adapter seams in `packages/core`.
- Placeholder worker package in `packages/worker`.
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
MAX_UPLOAD_FILES=9
MAX_UPLOAD_FILE_BYTES=104857600
MAX_UPLOAD_BATCH_BYTES=524288000
PHOTOMATIX_LICENSE_KEY=
```

`ADMIN_PASSWORD` is only for login validation. `ADMIN_SESSION_SECRET` signs the admin session cookie and must be a separate secret. `MAX_UPLOAD_FILES` defaults to 9, `MAX_UPLOAD_FILE_BYTES` defaults to 100 MiB, and `MAX_UPLOAD_BATCH_BYTES` defaults to 500 MiB for local-use upload safety. `PHOTOMATIX_LICENSE_KEY` is reserved for later PhotomatixCL work and is not used by Phase 2A code.

## Docker Compose

Start the local stack:

```bash
docker compose up --build
```

The Compose file defines:

- `web`: Next.js development service.
- `migrate`: one-shot SQL migration service that runs after Postgres is healthy and before `web` starts.
- `postgres`: Postgres service.
- `postgres_data`: named Postgres volume.
- `local_storage`: named placeholder volume for Phase 2 file storage.

The stack is configured for Apple Silicon with `linux/arm64` images.

`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `API_KEY` are required by Compose. The stack should fail to start if any of them are missing.

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
```

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
- Exposure-aware deterministic 7-shot, 3-shot, and ambiguous bracket grouping.
- Asset and bracket group review UI.
- Admin and API-key endpoints for listing assets/groups and approving/rejecting groups.
- Adapter seams for future auth, storage, HDR engine, and worker work.
- Documentation for API, auth, security, Phase 2A, Render shape, MCP-style REST contract, and Phase 2 preview.

Not included:

- PhotomatixCL worker.
- Export generation.
- HDR job creation.
- Reruns.
- Better Auth, OAuth, true MCP server, or runtime AI calls.

## Phase 2 Preview

Later Phase 2 work will add PhotomatixCL jobs, MLS/full JPEG exports, optional TIFF export, reruns, worker processing, and broader RAW fixture validation.
