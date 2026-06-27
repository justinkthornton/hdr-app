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

## AuthAdapter Seam

`packages/core/src/auth/adapter.ts` defines an `AuthAdapter` interface for later parent-app, Better Auth, or OAuth integration. The Phase 1 local adapter is a placeholder and does not authenticate users.

## Deferred Integrations

Better Auth and OAuth are deferred because Phase 1 is an internal MVP with one local admin password and a REST API key. Keeping those systems out avoids account-model churn before uploads, review flows, jobs, and exports exist.

Codex OAuth is build-time only and is not wired into runtime application auth.
