# Security

This is an internal local-use service. Keep the GitHub repository private unless Justin explicitly decides otherwise; if it is made public for audit, the repo must still contain no secrets, real client photos, generated outputs, local storage, or ignored env files.

## Ignored Local Secrets

The repo ignores `.env` and `.env.*`; `.env.example` is the only env file intended for Git.

Use the 1Password Environment named `HDR app` for local secrets. Mount it to the repo-local env file:

```text
.env
```

Local variables:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `API_KEY`
- `STORAGE_DRIVER`
- `LOCAL_STORAGE_ROOT`
- `MAX_UPLOAD_FILES`
- `MAX_UPLOAD_FILE_BYTES`
- `MAX_UPLOAD_BATCH_BYTES`
- `HDR_ENGINE_MODE`
- `PHOTOMATIXCL_PATH`
- `PHOTOMATIX_LICENSE_KEY`

`DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `API_KEY` are required for the local app. `MAX_UPLOAD_FILES`, `MAX_UPLOAD_FILE_BYTES`, `MAX_UPLOAD_BATCH_BYTES`, `HDR_ENGINE_MODE`, and `PHOTOMATIXCL_PATH` are local configuration knobs, not secrets. `PHOTOMATIX_LICENSE_KEY` is optional for Phase 2B trial work and must be treated as a secret if set.

## Do Not Commit

Do not commit:

- client photos
- local fixtures
- generated thumbnails
- generated outputs
- PhotomatixCL binaries
- PhotomatixCL installer archives
- API keys
- passwords
- access tokens
- session secrets
- database credentials
- Photomatix license keys
- `.env` or `.env.*` files

Generated JPEG thumbnails are stored under `LOCAL_STORAGE_ROOT` and served only through the admin-protected thumbnail endpoint. Do not expose thumbnail storage keys or local filesystem paths in public/API-key responses.

PhotomatixCL command strings, stdout, and stderr must be redacted before they are returned, logged, or stored. Never print the raw `PHOTOMATIX_LICENSE_KEY`.

Photomatix smoke receipts must also redact local home paths, project roots, storage roots, fixture roots, generated output paths, and binary paths. Use `local-photomatixcl/` for local binaries and `local-fixtures/` for local fixture photos; both are ignored by Git.

Use placeholders, variable names, or 1Password references in docs and examples.
