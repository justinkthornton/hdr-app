# Phase 2A

Phase 2A adds local upload, metadata extraction, bracket grouping, and review. It stops before HDR processing.

## Built

- `LocalVolumeStorage` stores uploaded originals under `LOCAL_STORAGE_ROOT`.
- Admin and API-key upload endpoints accept multipart file batches.
- JPEG metadata extraction reads capture time, camera model, lens model, dimensions, exposure time, aperture, ISO, exposure bias, and raw parser notes when present.
- RAW/TIFF extensions are accepted and stored with partial metadata notes.
- Deterministic bracket grouping creates pending-review 7-shot, 3-shot, and ambiguous groups.
- Shoot detail UI shows upload controls, uploaded assets, metadata, detected groups, and approve/reject actions.
- Admin and `/api/v1` endpoints expose assets, groups, get group, approve, and reject.

## Upload Flow

1. Open a shoot detail page.
2. Select multiple originals.
3. Submit the batch upload form.
4. The server creates an `upload_batches` row.
5. Each file is stored through `LocalVolumeStorage`.
6. Each file becomes an `assets` row with metadata fields.
7. Assets from the upload batch are grouped into candidate bracket groups.
8. Groups remain `pending_review` until an admin or API-key caller approves or rejects them.

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

## Fixture Guidance

See `fixtures/phase-2a/README.md`. Keep real fixtures local-only or outside the repo unless a specific fixture policy is approved.
