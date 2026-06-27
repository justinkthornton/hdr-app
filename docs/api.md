# API

Phase 1 implements health and shoot management only. Uploads, grouping, jobs, and exports are planned but not active.

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

## Error Shape

```json
{
  "error": "invalid_api_key"
}
```

Validation errors include an `issues` array from the shared schema.

## Planned Phase 2 Endpoints

- `POST /api/upload-batches`
- `GET /api/shoots/:shootId/bracket-groups`
- `POST /api/bracket-groups/:bracketGroupId/approve`
- `POST /api/hdr-jobs`
- `GET /api/hdr-jobs/:hdrJobId`
- `POST /api/hdr-jobs/:hdrJobId/rerun`
- `GET /api/shoots/:shootId/exports`
