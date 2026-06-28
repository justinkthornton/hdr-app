# Phase 2C

Phase 2C wires approved bracket groups into local HDR jobs and fake placeholder exports.

## Built

- `hdr_jobs.engine_mode` migration for fake versus Photomatix job intent.
- Repository helpers for `hdr_jobs` and `exports`.
- Admin endpoints for:
  - listing jobs by shoot or bracket group
  - creating jobs from approved bracket groups
  - processing a job now
  - listing exports
  - downloading export files
- `/api/v1` equivalents protected by `x-api-key`.
- Process-now job runner that uses `FakeHdrEngine` by default.
- Approved-group enforcement before job creation and processing.
- Deterministic fake export text files stored through `LocalVolumeStorage`.
- Safe response serialization that does not expose storage keys, storage root paths, raw local output paths, secrets, or license values.
- Shoot detail UI for creating fake HDR jobs and downloading placeholder exports.

## Fake Export Behavior

Fake exports are text files, not real HDR images.

Default UI output selections create:

- `mls-placeholder.txt`
- `full-placeholder.txt`

Optional TIFF selection creates:

- `tiff-placeholder.txt`

Each file clearly says it is a Phase 2C placeholder and not a real HDR image.

## PhotomatixCL Boundary

`HDR_ENGINE_MODE=fake` is the acceptance path.

`HDR_ENGINE_MODE=photomatix` and request-level `engineMode: "photomatix"` are supported behind the existing Phase 2B engine seam. If `PHOTOMATIXCL_PATH` is missing or not executable, the job is marked `failed` with `photomatixcl_missing_or_not_executable`. A Photomatix license is not required for Phase 2C/2D acceptance.

The app still must not log or expose `PHOTOMATIX_LICENSE_KEY`.

Phase 2D adds a UI engine selector and real-output import path, but fake remains the default and safe acceptance path.

## Not Built

Phase 2C intentionally does not add:

- full queue orchestration
- worker claiming of queued jobs
- rerun UX
- production object storage
- Better Auth or OAuth
- true MCP server
- runtime AI orchestration
- billing
- production deployment
- MLS delivery workflow
- advanced manual group editing
- real PhotomatixCL acceptance

## Safety Notes

- API responses include export IDs and safe download URLs, not `storageKey`.
- Job command receipts replace local storage roots with `[LOCAL_STORAGE_ROOT]`.
- Route responses omit engine output paths.
- Fake placeholder export files are generated under ignored local storage, not committed.
- Local fixture photos stay in ignored `local-fixtures/`.

## Validation Checklist

Required for Phase 2C acceptance:

- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm format`
- `pnpm db:migrate`
- `docker compose up --build -d`
- `docker compose ps -a`
- `pnpm smoke:phase1`
- `pnpm worker:smoke:fake`

Manual local-use validation:

- upload a 3-shot or 7-shot JPEG bracket
- approve a detected group
- click `Process approved group`
- confirm fake export download links appear
- download a placeholder export and confirm it says it is not a real HDR image

Conditional when PhotomatixCL is locally installed:

- `pnpm worker:smoke:photomatix`
- optional API/UI job with `engineMode: "photomatix"`
