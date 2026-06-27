# API

Phase 2A implements health, shoot management, local batch uploads, asset metadata, bracket-group review, and API-key read/control endpoints. HDR jobs and exports are still planned.

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

- `MAX_UPLOAD_FILES`, default `9`
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
  "assets": [],
  "bracketGroups": []
}
```

JPEG metadata extraction runs during upload. RAW/TIFF files are accepted and stored; metadata may be partial until fixtures and parser support are added.

Limit failures return:

```json
{
  "error": "too_many_files"
}
```

Other upload limit errors are `file_too_large` and `batch_too_large`. Unsupported extensions return `unsupported_file_type`.

If a later asset or group write fails after storage writes, the handler attempts to delete storage objects written by that request and returns `upload_failed`.

### GET /api/shoots/:shootId/assets

Admin session required. Lists uploaded originals and extracted metadata. Admin asset responses include internal `storageKey` and `rawMetadata` fields for the local review UI.

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

### GET /api/v1/shoots

Requires `x-api-key`. Same response shape as `GET /api/shoots`.

### POST /api/v1/shoots

Requires `x-api-key`. Same request and response shape as `POST /api/shoots`.

### GET /api/v1/shoots/:shootId

Requires `x-api-key`. Same response shape as `GET /api/shoots/:shootId`.

### POST /api/v1/shoots/:shootId/uploads

Requires `x-api-key`. Same multipart behavior as `POST /api/shoots/:shootId/uploads`. Asset objects in the response omit internal `storageKey` and broad `rawMetadata` fields.

### GET /api/v1/shoots/:shootId/assets

Requires `x-api-key`. Lists uploaded originals and extracted metadata, but omits internal `storageKey` and broad `rawMetadata` fields by default. Public asset fields include `originalFilename`, `mimeType`, `fileExt`, `fileSizeBytes`, `width`, `height`, `cameraModel`, `lensModel`, `capturedAt`, `exposureTime`, `aperture`, `iso`, `exposureBias`, and `extractionStatus`.

### GET /api/v1/shoots/:shootId/bracket-groups

Requires `x-api-key`. Same group-level response shape as `GET /api/shoots/:shootId/bracket-groups`, with nested assets using the sanitized `/api/v1` asset shape.

### GET /api/v1/bracket-groups/:groupId

Requires `x-api-key`. Same group-level response shape as `GET /api/bracket-groups/:groupId`, with nested assets using the sanitized `/api/v1` asset shape.

### POST /api/v1/bracket-groups/:groupId/approve

Requires `x-api-key`. Same group-level response shape as `POST /api/bracket-groups/:groupId/approve`, with nested assets using the sanitized `/api/v1` asset shape.

### POST /api/v1/bracket-groups/:groupId/reject

Requires `x-api-key`. Same group-level response shape as `POST /api/bracket-groups/:groupId/reject`, with nested assets using the sanitized `/api/v1` asset shape.

## Error Shape

```json
{
  "error": "invalid_api_key"
}
```

Validation errors include an `issues` array from the shared schema.

## Planned Later Endpoints

- `POST /api/hdr-jobs`
- `GET /api/hdr-jobs/:hdrJobId`
- `POST /api/hdr-jobs/:hdrJobId/rerun`
- `GET /api/shoots/:shootId/exports`
