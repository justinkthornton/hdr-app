# Phase 2B

Phase 2B validates the HDR worker path without turning approved bracket groups into real jobs yet.

## Built

- `FakeHdrEngine` for deterministic local and CI-safe smoke tests.
- `PhotomatixCliEngine` for a future real PhotomatixCL call path.
- Redacted command construction and stdout/stderr redaction.
- Structured engine results with success/failure, exit code, timeout status, output paths, command text, metadata, and errors.
- `pnpm worker:smoke:fake`, which does not require PhotomatixCL.
- `pnpm worker:smoke:photomatix`, which requires `PHOTOMATIXCL_PATH`.
- `hdr-worker` Docker Compose service behind the `worker` profile.
- `docker/worker.Dockerfile` and opt-in `docker/install-photomatixcl.sh`.
- Local fixture and generated-output ignore rules.

## Not Built

Phase 2B intentionally does not add:

- automatic HDR job creation from approved groups
- queue/worker orchestration
- export records or download UI
- reruns
- production deployment
- Better Auth, OAuth, true MCP, runtime AI, or image generation

## Worker Architecture

Normal app startup remains:

```bash
docker compose up --build -d
```

The worker spike runs explicitly:

```bash
docker compose --profile worker run --rm hdr-worker pnpm worker:smoke:fake
```

The worker mounts:

- `local_storage` at `/data/storage`
- ignored local fixtures at `/app/local-fixtures`
- ignored local Photomatix binaries at `/opt/photomatixcl-local`

## Smoke Commands

Fake smoke:

```bash
pnpm worker:smoke:fake
```

PhotomatixCL smoke:

```bash
PHOTOMATIXCL_PATH=/opt/photomatixcl-local/PhotomatixCL \
pnpm worker:smoke:photomatix
```

When `PHOTOMATIXCL_PATH` is absent, the Photomatix smoke returns a clear blocker instead of pretending success.

## PhotomatixCL Trial Path

See [docs/photomatixcl.md](./photomatixcl.md).

Phase 2B supports trial mode. Trial output may be watermarked. A paid license is not required for fake smoke or binary startup validation.

If `PHOTOMATIX_LICENSE_KEY` exists, `PhotomatixCliEngine` redacts it from:

- command text
- stdout
- stderr
- returned error metadata

## Fixture Policy

See [fixtures/phase-2b/README.md](../fixtures/phase-2b/README.md).

Real bracket fixtures stay outside Git. A local 3-shot non-client JPEG set is enough for Phase 2B.

## Validation Checklist

Required for Phase 2B acceptance:

- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm format`
- `pnpm db:migrate`
- `docker compose up --build -d`
- `docker compose ps -a` or a non-hanging Docker status readback
- `pnpm smoke:phase1`
- `pnpm worker:smoke:fake`

Conditional when PhotomatixCL is installed:

- `pnpm worker:smoke:photomatix`
- `docker compose --profile worker run --rm hdr-worker pnpm worker:smoke:photomatix`
- binary startup result documented
- license loading skipped/passed/failed documented without printing the key
- bracket processing skipped/passed/failed documented
- generated output location documented

## Known Limits

- Real PhotomatixCL binary validation depends on a local Linux ARM binary or approved explicit download URL.
- Real bracket processing depends on local non-client JPEG fixtures.
- Phase 2C still needs job creation, export rows, queue orchestration, reruns, and UI integration.

## Next Step

Phase 2C should wire approved bracket groups into HDR jobs and generated exports using the engine seam built here.
