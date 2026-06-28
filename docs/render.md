# Render-Shaped Architecture

Phase 1 is local-first but shaped so a Render deployment can be added later.

## Current Services

- `web`: Next.js app serving the admin UI and REST API.
- `postgres`: Postgres database.
- `hdr-worker`: Phase 2B local Docker worker smoke profile. This is not a Render production worker yet.

Render deployment is not required for Phase 1 acceptance.

## Future Services

- `worker`: background worker for EXIF grouping, PhotomatixCL jobs, and exports.
- `hdr-worker`: Phase 2B spike container for fake and PhotomatixCL smoke checks.
- `object storage`: durable uploaded originals and generated outputs.
- `postgres`: shared relational state for shoots, assets, bracket groups, jobs, exports, and events.

## Environment Variables

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `API_KEY`
- `STORAGE_DRIVER`
- `LOCAL_STORAGE_ROOT`
- `HDR_ENGINE_MODE`
- `PHOTOMATIXCL_PATH`
- `PHOTOMATIX_LICENSE_KEY`

`PHOTOMATIX_LICENSE_KEY` is optional for Phase 2B trial smoke work and should be stored as a secret if used. `PHOTOMATIXCL_PATH` is a path, not a secret.

## Runtime Notes

- Phase 1 can run with Docker Compose locally.
- Phase 2B can run the local worker smoke with `docker compose --profile worker run --rm hdr-worker pnpm worker:smoke:fake`.
- Local storage is a named Docker volume used for uploaded originals, thumbnails, and future generated outputs.
- Render secrets should be set in Render environment settings, not committed to the repo.
