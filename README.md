# Structure-Locked HDR Service

Internal real estate HDR processing service foundation. Phase 1 builds the local-first TypeScript app, database schema, admin UI, REST control surface, and documentation. Image upload, EXIF grouping, PhotomatixCL processing, worker execution, and exports are intentionally deferred to Phase 2.

## Stack

- pnpm workspace for a small TypeScript monorepo.
- Next.js, React, and TypeScript in `apps/web`.
- Shared contracts, validation, auth helpers, database helpers, and future adapter seams in `packages/core`.
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
ADMIN_PASSWORD=replace-with-a-local-admin-password
API_KEY=replace-with-a-local-api-key
STORAGE_DRIVER=local
LOCAL_STORAGE_ROOT=/data/storage
PHOTOMATIX_LICENSE_KEY=
```

`PHOTOMATIX_LICENSE_KEY` is a Phase 2 placeholder and is not used by Phase 1 code.

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

## Database

Run migrations against the configured `DATABASE_URL`:

```bash
pnpm db:migrate
```

When using Docker Compose, migrations run automatically through the `migrate` service before the web service starts.

Reset the local database only when you intentionally want to drop local data:

```bash
CONFIRM_DB_RESET=structure-locked-hdr-service pnpm db:reset
```

## Development

```bash
pnpm dev
```

Open `http://localhost:3000`, sign in with `ADMIN_PASSWORD`, and create/list shoots from the dashboard.

## Checks

```bash
pnpm test
pnpm lint
pnpm build
pnpm format
```

## Phase 1 Scope

Included:

- Repo and TypeScript workspace foundation.
- SQL schema for Phase 1 and Phase 2-facing entities.
- Local admin password auth for UI routes.
- API-key auth for `/api/v1/*`.
- REST endpoints for health and shoots.
- Basic admin UI.
- Adapter seams for future auth, storage, and HDR engine work.
- Documentation for API, auth, Render shape, MCP-style REST contract, and Phase 2 preview.

Not included:

- Image upload.
- EXIF extraction.
- Bracket grouping.
- PhotomatixCL worker.
- Export generation.
- Better Auth, OAuth, true MCP server, or runtime AI calls.

## Phase 2 Preview

Phase 2 will add batch upload, EXIF capture-time grouping, 7-shot and 3-shot review flows, PhotomatixCL jobs, MLS/full JPEG exports, optional TIFF export, and fixture-driven RAW/JPEG testing.
