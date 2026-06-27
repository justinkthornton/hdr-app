# Security

This is an internal local-use service. Keep the GitHub repository private unless Justin explicitly decides otherwise; if it is made public for audit, the repo must still contain no secrets, real client photos, generated outputs, local storage, or ignored env files.

## Ignored Local Secrets

The repo ignores `.env` and `.env.*`; `.env.example` is the only env file intended for Git.

Use the 1Password Environment named `HDR app` for local secrets. Mount it to:

```text
/Users/justinthornton/Documents/Codex Apps/HDR app/.env
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

`DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `API_KEY` are required for the local app. `MAX_UPLOAD_FILES`, `MAX_UPLOAD_FILE_BYTES`, and `MAX_UPLOAD_BATCH_BYTES` are defaulted local safety knobs, not secrets. `PHOTOMATIX_LICENSE_KEY` is reserved for Phase 2 and may be empty during Phase 2A.

## Do Not Commit

Do not commit:

- client photos
- generated outputs
- API keys
- passwords
- access tokens
- session secrets
- database credentials
- Photomatix license keys
- `.env` or `.env.*` files

Use placeholders, variable names, or 1Password references in docs and examples.
