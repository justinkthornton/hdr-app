# Auth

Phase 1 uses two intentionally small auth paths: one local admin password for the UI and one API key for REST control.

## Local Admin Password

- The UI login posts to `/api/admin/login`.
- The password is compared with `ADMIN_PASSWORD`.
- A signed HTTP-only cookie stores the local admin session.
- Session signing uses `ADMIN_PASSWORD`, so changing the password invalidates existing sessions.
- There is no user table and no multi-user auth in Phase 1.

## API Key

- `/api/v1/*` requires the `x-api-key` header.
- The middleware compares the header to `API_KEY`.
- Missing and invalid keys return a clear `401`.
- The key is never logged or returned.
- `packages/core` includes a hash/check helper for later persistent API-key storage.

## 1Password Environment Workflow

For local Phase 1 runtime validation, mount the 1Password Environment named `HDR app` to the repo's ignored `.env` path:

```text
/Users/justinthornton/Documents/Codex Apps/HDR app/.env
```

Required variable names:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `API_KEY`
- `STORAGE_DRIVER`
- `LOCAL_STORAGE_ROOT`
- `PHOTOMATIX_LICENSE_KEY` may be absent or empty for Phase 1 because PhotomatixCL is not used yet.

Do not commit `.env` or print secret values. The root `db:migrate`, `db:reset`, and `smoke:phase1` scripts load the ignored `.env` file for their child processes without displaying values.

## AuthAdapter Seam

`packages/core/src/auth/adapter.ts` defines an `AuthAdapter` interface for later parent-app, Better Auth, or OAuth integration. The Phase 1 local adapter is a placeholder and does not authenticate users.

## Deferred Integrations

Better Auth and OAuth are deferred because Phase 1 is an internal MVP with one local admin password and a REST API key. Keeping those systems out avoids account-model churn before uploads, review flows, jobs, and exports exist.

Codex OAuth is build-time only and is not wired into runtime application auth.
