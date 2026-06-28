# API

Phase 2C implements health, shoot management, local batch uploads, asset metadata, bracket-group review, fake HDR job processing, export records, downloads, and API-key read/control endpoints.

## Auth

- `/api/admin/*` and `/api/shoots/*` are for the local admin UI and require the admin session cookie.
- `/api/v1/*` requires `x-api-key`.
- API keys are compared against `API_KEY` from the runtime environment. Keys are never logged.

## Implemented Endpoints

### GET /api/v1/health

Requires `x-api-key`.

Response:

```json
{
  "ok": true,
  "service": "structure-locked-hdr-service",
  "phase": "phase-1",
  "pipelineEnabled": false
}
```

### POST /api/admin/login

Body:

```json
{
  "password": "value-from-ADMIN_PASSWORD"
}
```

Sets an HTTP-only admin session cookie when the password matches `ADMIN_PASSWORD`. The cookie is signed with `ADMIN_SESSION_SECRET`.

### POST /api/admin/logout

Clears the admin session cookie.

### GET /api/admin/session

Response:

```json
{
  "authenticated": true
}
```

### GET /api/shoots

Admin session required.

Response:

```json
{
  "shoots": [
    {
      "id": "6e559077-11fc-4f53-8e32-0dcb047893ea",
      "name": "Maple Street",
      "clientName": "Acme Realty",
      "propertyAddress": "123 Maple Street",
      "notes": null,
      "tags": ["exterior"],
      "createdAt": "2026-06-27T12:00:00.000Z",
      "updatedAt": "2026-06-27T12:00:00.000Z"
    }
  ]
}
```

### POST /api/shoots

Admin session required.

Body:

```json
{
  "name": "Maple Street",
  "clientName": "Acme Realty",
  "propertyAddress": "123 Maple Street",
  "notes": "Front exterior and kitchen.",
  "tags": ["exterior"]
}
```

### GET /api/shoots/:shootId

Admin session required.

### POST /api/shoots/:shootId/uploads

Admin session required. Accepts `multipart/form-data` with one or more `files` entries.

Upload limits are enforced before storage or asset rows are written:

- `MAX_UPLOAD_FILES`, default `30`
- `MAX_UPLOAD_FILE_BYTES`, default `104857600`
- `MAX_UPLOAD_BATCH_BYTES`, default `524288000`

Accepted extensions:

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

Response:

```json
{
  "uploadBatch": {
    "id": "7d5e4b9b-7d1b-4c2a-9de0-2489ac54cc1c",
    "status": "uploaded",
    "originalFileCount": 7
  },
  "groupSummary": {
    "uploadedPhotoCount": 7,
    "detectedGroupCount": 1,
    "detectedSevenShotGroupCount": 1,
    "detectedThreeShotGroupCount": 0,
    "ambiguousPhotoCount": 0
  },
  "assets": [],
  "bracketGroups": []
}
```

JPEG metadata extraction and JPEG thumbnail generation run during upload. RAW/TIFF files are accepted and stored; metadata may be partial and thumbnails are deferred until fixtures and parser support are added.

Limit failures return:

```json
{
  "error": "too_many_files"
}
```

Other upload limit errors are `file_too_large` and `batch_too_large`. Unsupported extensions return `unsupported_file_type`.

If a later asset or group write fails after storage writes, the handler attempts to delete storage objects written by that request and returns `upload_failed`.

### GET /api/shoots/:shootId/assets

Admin session required. Lists uploaded originals and extracted metadata. Admin asset responses include `thumbnailUrl` for the protected preview route plus internal `storageKey` and `rawMetadata` fields for the local review UI.

### GET /api/assets/:assetId/thumbnail

Admin session required. Returns the locally generated JPEG thumbnail for a JPEG asset. The response is `404` when the asset has no thumbnail, such as RAW/TIFF files or older uploads created before thumbnail generation. This endpoint does not expose local storage paths.

### GET /api/shoots/:shootId/bracket-groups

Admin session required. Lists detected candidate groups and their assets.

### GET /api/bracket-groups/:groupId

Admin session required. Returns one bracket group with ordered assets.

### POST /api/bracket-groups/:groupId/approve

Admin session required. Sets `status` to `approved`, updates `reviewed_at`, and sets `approved_at`. It does not start HDR processing.

### POST /api/bracket-groups/:groupId/reject

Admin session required. Sets `status` to `rejected` and updates `reviewed_at`.

### PATCH /api/shoots/:shootId

Admin session required. Accepts any subset of `name`, `clientName`, `propertyAddress`, `notes`, and `tags`.

Example:

```json
{
  "notes": "Updated by Phase 1 smoke test"
}
```

### GET /api/shoots/:shootId/hdr-jobs

Admin session required. Lists HDR jobs for a shoot, including safe export metadata and download URLs.

### GET /api/bracket-groups/:groupId/hdr-jobs

Admin session required. Lists HDR jobs for one bracket group.

### POST /api/bracket-groups/:groupId/hdr-jobs

Admin session required. Requires the bracket group to be `approved`.

Body:

```json
{
  "preset": "Natural",
  "engineMode": "fake",
  "outputMlsJpeg": true,
  "outputFullJpeg": true,
  "outputTiff": false
}
```

Defaults:

- `preset`: `Natural`
- `engineMode`: `HDR_ENGINE_MODE`, default `fake`
- `outputMlsJpeg`: `true`
- `outputFullJpeg`: `true`
- `outputTiff`: `false`

If the group is not approved, the endpoint returns:

```json
{
  "error": "bracket_group_not_approved"
}
```

### GET /api/hdr-jobs/:jobId

Admin session required. Returns one job and its safe export metadata.

### POST /api/hdr-jobs/:jobId/process

Admin session required. Processes the job immediately. In fake mode, this creates placeholder text exports through local storage. If Photomatix mode is requested without `PHOTOMATIXCL_PATH`, the job is marked `failed` with `photomatixcl_missing_or_not_executable`.

### GET /api/hdr-jobs/:jobId/exports

Admin session required. Lists safe export metadata for one job.

### GET /api/exports/:exportId/download

Admin session required. Downloads a generated export file. Phase 2C fake exports are text placeholders that clearly say they are not real HDR images.

Job/export responses are safe to expose to the local UI and API clients. They include IDs, status, preset, output choices, sanitized `commandRedacted`, safe `errorMessage`, export kind, MIME type, file size, and download URLs. They do not expose internal `storageKey`, `LOCAL_STORAGE_ROOT`, raw local output paths, database URLs, API keys, passwords, license keys, or raw secret values.

### GET /api/v1/shoots

Requires `x-api-key`. Same response shape as `GET /api/shoots`.

### POST /api/v1/shoots

Requires `x-api-key`. Same request and response shape as `POST /api/shoots`.

### GET /api/v1/shoots/:shootId

Requires `x-api-key`. Same response shape as `GET /api/shoots/:shootId`.

### POST /api/v1/shoots/:shootId/uploads

Requires `x-api-key`. Same multipart behavior as `POST /api/shoots/:shootId/uploads`. Asset objects in the response omit internal `storageKey`, `thumbnailUrl`, and broad `rawMetadata` fields.

### GET /api/v1/shoots/:shootId/assets

Requires `x-api-key`. Lists uploaded originals and extracted metadata, but omits internal `storageKey`, `thumbnailUrl`, and broad `rawMetadata` fields by default. Public asset fields include `originalFilename`, `mimeType`, `fileExt`, `fileSizeBytes`, `width`, `height`, `cameraModel`, `lensModel`, `capturedAt`, `exposureTime`, `aperture`, `iso`, `exposureBias`, and `extractionStatus`.

### GET /api/v1/shoots/:shootId/bracket-groups

Requires `x-api-key`. Same group-level response shape as `GET /api/shoots/:shootId/bracket-groups`, with nested assets using the sanitized `/api/v1` asset shape.

### GET /api/v1/bracket-groups/:groupId

Requires `x-api-key`. Same group-level response shape as `GET /api/bracket-groups/:groupId`, with nested assets using the sanitized `/api/v1` asset shape.

### POST /api/v1/bracket-groups/:groupId/approve

Requires `x-api-key`. Same group-level response shape as `POST /api/bracket-groups/:groupId/approve`, with nested assets using the sanitized `/api/v1` asset shape.

### POST /api/v1/bracket-groups/:groupId/reject

Requires `x-api-key`. Same group-level response shape as `POST /api/bracket-groups/:groupId/reject`, with nested assets using the sanitized `/api/v1` asset shape.

### GET /api/v1/shoots/:shootId/hdr-jobs

Requires `x-api-key`. Same safe job/export response shape as `GET /api/shoots/:shootId/hdr-jobs`, with `/api/v1` download URLs.

### GET /api/v1/bracket-groups/:groupId/hdr-jobs

Requires `x-api-key`. Same safe response shape as `GET /api/bracket-groups/:groupId/hdr-jobs`.

### POST /api/v1/bracket-groups/:groupId/hdr-jobs

Requires `x-api-key`. Same behavior as the admin job creation endpoint.

### GET /api/v1/hdr-jobs/:jobId

Requires `x-api-key`. Same safe response shape as `GET /api/hdr-jobs/:jobId`.

### POST /api/v1/hdr-jobs/:jobId/process

Requires `x-api-key`. Same process-now behavior as the admin endpoint.

### GET /api/v1/hdr-jobs/:jobId/exports

Requires `x-api-key`. Same safe response shape as the admin endpoint.

### GET /api/v1/exports/:exportId/download

Requires `x-api-key`. Downloads a generated export file.

## Error Shape

```json
{
  "error": "invalid_api_key"
}
```

Validation errors include an `issues` array from the shared schema.

## Planned Later Endpoints

- `POST /api/hdr-jobs/:hdrJobId/rerun`
- `GET /api/shoots/:shootId/exports`
