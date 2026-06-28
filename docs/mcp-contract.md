# MCP-Style REST Contract

The app does not implement a true MCP server. Hermes can treat these as REST-backed tool shapes.

## Implemented

### create_shoot

REST backing: `POST /api/v1/shoots`

Input:

```json
{
  "name": "Maple Street",
  "clientName": "Acme Realty",
  "propertyAddress": "123 Maple Street",
  "notes": "Front exterior and kitchen.",
  "tags": ["exterior"]
}
```

Output:

```json
{
  "shoot": {
    "id": "6e559077-11fc-4f53-8e32-0dcb047893ea",
    "name": "Maple Street"
  }
}
```

### list_shoots

REST backing: `GET /api/v1/shoots`

Input:

```json
{}
```

Output:

```json
{
  "shoots": []
}
```

### get_shoot

REST backing: `GET /api/v1/shoots/:shootId`

Input:

```json
{
  "shootId": "6e559077-11fc-4f53-8e32-0dcb047893ea"
}
```

Output:

```json
{
  "shoot": {
    "id": "6e559077-11fc-4f53-8e32-0dcb047893ea",
    "name": "Maple Street"
  }
}
```

## Implemented In Phase 2A

### list_assets

REST backing: `GET /api/v1/shoots/:shootId/assets`

Output uses the sanitized `/api/v1` asset shape. It includes useful review fields such as filename, MIME type, file size, dimensions, camera/lens model, capture time, exposure metadata, and `extractionStatus`. It does not expose internal `storageKey` or broad `rawMetadata` fields by default.

### list_bracket_groups

REST backing: `GET /api/v1/shoots/:shootId/bracket-groups`

Nested assets use the same sanitized `/api/v1` asset shape.

### get_bracket_group

REST backing: `GET /api/v1/bracket-groups/:bracketGroupId`

Nested assets use the same sanitized `/api/v1` asset shape.

### approve_bracket_group

REST backing: `POST /api/v1/bracket-groups/:bracketGroupId/approve`

### reject_bracket_group

REST backing: `POST /api/v1/bracket-groups/:bracketGroupId/reject`

### create_upload_batch

REST backing: `POST /api/v1/shoots/:shootId/uploads`

This endpoint is implemented as a multipart REST upload. It enforces the same local upload limits as the admin endpoint and returns `too_many_files`, `file_too_large`, or `batch_too_large` for limit failures. A future Hermes tool wrapper can call it when file transfer semantics are settled.

## Implemented In Phase 2C

### create_hdr_job

REST backing: `POST /api/v1/bracket-groups/:bracketGroupId/hdr-jobs`

Input:

```json
{
  "bracketGroupId": "0b2fcd19-3424-4b39-a54c-9ac94d80e379",
  "preset": "Natural",
  "engineMode": "fake",
  "outputMlsJpeg": true,
  "outputFullJpeg": true,
  "outputTiff": false
}
```

The bracket group must already be approved.

### list_hdr_jobs_for_shoot

REST backing: `GET /api/v1/shoots/:shootId/hdr-jobs`

### list_hdr_jobs_for_bracket_group

REST backing: `GET /api/v1/bracket-groups/:bracketGroupId/hdr-jobs`

### get_hdr_job

REST backing: `GET /api/v1/hdr-jobs/:hdrJobId`

### process_hdr_job

REST backing: `POST /api/v1/hdr-jobs/:hdrJobId/process`

The Phase 2C acceptance path is fake mode. Fake processing creates placeholder text exports, not real HDR images.

### list_hdr_job_exports

REST backing: `GET /api/v1/hdr-jobs/:hdrJobId/exports`

### download_export

REST backing: `GET /api/v1/exports/:exportId/download`

The download call returns the stored export file. API clients should treat fake Phase 2C exports as placeholders.

## Still Planned

### rerun_hdr_job

Planned REST backing: `POST /api/v1/hdr-jobs/:hdrJobId/rerun`

### list_exports

Planned REST backing: `GET /api/v1/shoots/:shootId/exports`

## Auth

All `/api/v1/*` calls require `x-api-key`.

## Boundary

There is no MCP server, no runtime AI model call, and no Codex credential path inside the app.

Phase 2C job/export responses intentionally omit local storage keys, storage root paths, raw engine output paths, database URLs, API keys, passwords, license keys, and raw secret values.
