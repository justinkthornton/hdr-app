# Render-Shaped Architecture

Phase 1 is local-first but shaped so a Render deployment can be added later.

## Current Services

- `web`: Next.js app serving the admin UI and REST API.
- `postgres`: Postgres database.

Render deployment is not required for Phase 1 acceptance.

## Future Services

- `worker`: background worker for EXIF grouping, PhotomatixCL jobs, and exports.
- `object storage`: durable uploaded originals and generated outputs.
- `postgres`: shared relational state for shoots, assets, bracket groups, jobs, exports, and events.

## Environment Variables

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `API_KEY`
- `STORAGE_DRIVER`
- `LOCAL_STORAGE_ROOT`
- `PHOTOMATIX_LICENSE_KEY`

`PHOTOMATIX_LICENSE_KEY` is reserved for Phase 2 and should be stored as a secret when the worker is added.

## Runtime Notes

- Phase 1 can run with Docker Compose locally.
- The worker container is intentionally not present yet.
- Local storage is a placeholder volume. It is not used by Phase 1 upload code because uploads are deferred.
- Render secrets should be set in Render environment settings, not committed to the repo.
