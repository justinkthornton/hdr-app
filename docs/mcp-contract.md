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

### list_bracket_groups

REST backing: `GET /api/v1/shoots/:shootId/bracket-groups`

### get_bracket_group

REST backing: `GET /api/v1/bracket-groups/:bracketGroupId`

### approve_bracket_group

REST backing: `POST /api/v1/bracket-groups/:bracketGroupId/approve`

### reject_bracket_group

REST backing: `POST /api/v1/bracket-groups/:bracketGroupId/reject`

### create_upload_batch

REST backing: `POST /api/v1/shoots/:shootId/uploads`

This endpoint is implemented as a multipart REST upload. A future Hermes tool wrapper can call it when file transfer semantics are settled.

## Still Planned

### create_hdr_job

Planned REST backing: `POST /api/v1/hdr-jobs`

### get_hdr_job

Planned REST backing: `GET /api/v1/hdr-jobs/:hdrJobId`

### rerun_hdr_job

Planned REST backing: `POST /api/v1/hdr-jobs/:hdrJobId/rerun`

### list_exports

Planned REST backing: `GET /api/v1/shoots/:shootId/exports`

## Auth

All `/api/v1/*` calls require `x-api-key`.

## Boundary

There is no MCP server, no runtime AI model call, and no Codex credential path inside the app.
