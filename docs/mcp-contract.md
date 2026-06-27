# MCP-Style REST Contract

Phase 1 does not implement a true MCP server. Hermes can treat these as REST-backed tool shapes later.

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

## Planned

### create_upload_batch

Planned REST backing: `POST /api/v1/shoots/:shootId/upload-batches`

### list_bracket_groups

Planned REST backing: `GET /api/v1/shoots/:shootId/bracket-groups`

### approve_bracket_group

Planned REST backing: `POST /api/v1/bracket-groups/:bracketGroupId/approve`

### create_hdr_job

Planned REST backing: `POST /api/v1/hdr-jobs`

### get_hdr_job

Planned REST backing: `GET /api/v1/hdr-jobs/:hdrJobId`

### rerun_hdr_job

Planned REST backing: `POST /api/v1/hdr-jobs/:hdrJobId/rerun`

### tag_shoot

Planned REST backing: `PATCH /api/v1/shoots/:shootId`

### list_exports

Planned REST backing: `GET /api/v1/shoots/:shootId/exports`

## Auth

All `/api/v1/*` calls require `x-api-key`.

## Phase 1 Boundary

The contract is documentation only. There is no MCP server, no runtime AI model call, and no Codex credential path inside the app.
