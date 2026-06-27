# Security

Phase 1 is an internal, private-repo service. Keep the GitHub repository private unless Justin explicitly decides otherwise.

## Ignored Local Secrets

The repo ignores `.env` and `.env.*`; `.env.example` is the only env file intended for Git.

Use the 1Password Environment named `HDR app` for local secrets. Mount it to:

```text
/Users/justinthornton/Documents/Codex Apps/HDR app/.env
```

Required local variables:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `API_KEY`
- `STORAGE_DRIVER`
- `LOCAL_STORAGE_ROOT`

`PHOTOMATIX_LICENSE_KEY` is reserved for Phase 2 and may be empty during Phase 1.

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
