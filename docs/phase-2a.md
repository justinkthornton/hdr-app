# Phase 2A

Phase 2A adds local upload, metadata extraction, bracket grouping, and review. It stops before HDR processing.

## Built

- `LocalVolumeStorage` stores uploaded originals under `LOCAL_STORAGE_ROOT`.
- Admin and API-key upload endpoints accept multipart file batches.
- Upload safety limits are env-backed: `MAX_UPLOAD_FILES` defaults to 9, `MAX_UPLOAD_FILE_BYTES` defaults to 100 MiB, and `MAX_UPLOAD_BATCH_BYTES` defaults to 500 MiB.
- JPEG metadata extraction reads capture time, camera model, lens model, dimensions, exposure time, aperture, ISO, exposure bias, and raw parser notes when present.
- RAW/TIFF extensions are accepted and stored with partial metadata notes.
- Exposure-aware deterministic bracket grouping creates pending-review 7-shot, 3-shot, and ambiguous groups.
- Shoot detail UI shows upload controls, uploaded assets, metadata, detected groups, and approve/reject actions.
- Admin and `/api/v1` endpoints expose assets, groups, get group, approve, and reject.

## Upload Flow

1. Open a shoot detail page.
2. Select multiple originals.
3. Submit the batch upload form.
4. The server rejects unsafe requests before writing storage or database rows when the batch has too many files, an oversized file, an oversized total batch, an unsupported extension, or no file entries.
5. The server creates an `upload_batches` row.
6. Each file is stored through `LocalVolumeStorage`.
7. Each file becomes an `assets` row with metadata fields.
8. Assets from the upload batch are grouped into candidate bracket groups.
9. Groups remain `pending_review` until an admin or API-key caller approves or rejects them.

Limit failures return clear 400 errors:

- `too_many_files`
- `file_too_large`
- `batch_too_large`

If storage succeeds but a later asset or group write fails, the upload handler attempts to delete every storage object written during that request and returns `upload_failed`. Phase 2A does not yet wrap the upload batch, asset rows, and group rows in one database transaction, so a database failure after partial inserts can still require manual local cleanup.

## Storage Layout

Originals use stable keys:

```text
shoots/{shootId}/uploads/{uploadBatchId}/originals/{assetId}-{safeFilename}
```

Filenames are sanitized and storage keys reject path traversal. Originals are written under `LOCAL_STORAGE_ROOT`, which is mounted as `/data/storage` in Docker Compose.

## Accepted File Types

- `.jpg`
- `.jpeg`
- `.tif`
- `.tiff`
- `.cr3`
- `.cr2`
- `.dng`
- `.arw`
- `.nef`
- `.raf`

## Metadata Extraction

JPEG metadata is parsed locally without modifying originals. RAW/TIFF files are stored now, but parser support is partial until representative fixtures are available.

RAW targets for later fixture work:

- Canon EOS R5 class files
- DJI Mini 4K class files

## Grouping Rules

- Only assets from the same upload batch are grouped together.
- Assets are partitioned by shoot, upload batch, camera model, and dimensions when present.
- Capture time is the primary ordering signal.
- Exposure time is used to avoid splitting long-exposure brackets. Supported exposure formats are seconds (`30`, `30s`, `30 sec`, `30 seconds`, `0.5`, `0.5s`) and simple fractions (`1/2`, `1/125`).
- When the previous asset has a supported exposure time, grouping compares the next capture start to the previous exposure end. If exposure time is missing or unsupported, grouping falls back to the raw capture-time gap.
- Clean 7-shot clusters are preferred.
- Clean 3-shot clusters are used when seven close captures are not present.
- Extra or missing-time groups stay pending review with lower confidence.
- Groups are never auto-approved.

## Review Workflow

The UI shows each group with status, confidence, detected/expected count, reason, filename order, and exposure metadata. Approve and reject persist to `bracket_groups.reviewed_at`; approved groups also set `approved_at`.

Approval does not start PhotomatixCL, HDR jobs, exports, reruns, or worker processing.

## Known Limitations

- No PhotomatixCL integration.
- No HDR rendering.
- No worker processing.
- No exports.
- No reruns.
- No Better Auth or OAuth.
- No true MCP server.
- No runtime AI.
- No RAW thumbnailing.
- JPEG thumbnails are not generated in Phase 2A; the UI shows filenames and metadata.
- Manual validation with real JPEG bracket fixtures is pending until local non-client fixtures are supplied.
- Upload cleanup is best-effort for local storage objects and is not yet a full database transaction.

## Testing

Run:

```bash
pnpm test
pnpm lint
pnpm build
pnpm format
pnpm db:migrate
docker compose up --build -d
docker compose ps -a
```

Manual validation should use local-only images. Do not commit real photos.

Real fixture validation targets:

- One local non-client 7-shot JPEG bracket set should upload successfully, list all assets, show extracted metadata where present, create one 7-shot pending-review group, and persist approve/reject actions.
- One local non-client 3-shot JPEG bracket set should upload successfully, list all assets, show extracted metadata where present, create one 3-shot pending-review group, and persist approve/reject actions.
- Until those real fixtures are supplied and tested, do not claim real-photo bracket validation has passed.

## Fixture Guidance

See `fixtures/phase-2a/README.md`. Keep real fixtures local-only or outside the repo unless a specific fixture policy is approved.
