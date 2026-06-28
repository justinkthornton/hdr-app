# Phase 2D

Phase 2D prepares and validates the real PhotomatixCL smoke path without making Photomatix mandatory.

## Built

- Staged `pnpm worker:smoke:photomatix` reporting for:
  - binary path/configuration
  - startup probe
  - optional license load
  - fixture presence
  - real render attempt
- Smoke output redaction for:
  - `PHOTOMATIX_LICENSE_KEY`
  - local home paths
  - project root paths
  - local storage root paths
  - Photomatix binary path
  - fixture and output directories
- `PhotomatixCliEngine.checkLicense()` so license loading can be reported as its own redacted stage.
- App job-runner test seam for simulated Photomatix output imports without requiring a real binary in automated tests.
- Shoot detail UI engine choice with fake mode as the default and PhotomatixCL as opt-in.
- Honest job/export labels:
  - fake exports are placeholders, not real HDR images
  - Photomatix outputs may be trial/watermarked
- Real Photomatix output import path:
  - confirms output file exists before marking a job succeeded
  - stores the produced file through `LocalVolumeStorage`
  - creates export rows
  - maps one produced JPEG to both MLS and full JPEG export kinds in Phase 2D

## Manual Setup

Preferred local binary path on the host:

```text
local-photomatixcl/PhotomatixCL
```

Expected path inside the worker container:

```text
/opt/photomatixcl-local/PhotomatixCL
```

Set:

```bash
PHOTOMATIXCL_PATH=/opt/photomatixcl-local/PhotomatixCL
```

`local-photomatixcl/` is ignored by Git. Do not commit PhotomatixCL binaries or installer archives.

## Fixture Setup

Preferred host fixture path:

```text
local-fixtures/phase-2b/photomatix-smoke/3-shot-jpeg/
```

Expected path inside the worker container:

```text
/app/local-fixtures/phase-2b/photomatix-smoke/3-shot-jpeg/
```

Use at least three non-client JPEGs from one bracket. Do not commit fixture images.

If only the Phase 2A fixtures exist locally, copy or symlink one 3-shot set into the Phase 2B smoke path:

```bash
mkdir -p local-fixtures/phase-2b/photomatix-smoke/3-shot-jpeg
cp local-fixtures/phase-2a/3-shot-jpeg/*.JPG local-fixtures/phase-2b/photomatix-smoke/3-shot-jpeg/
```

## Smoke Commands

Fake smoke, always expected to work:

```bash
pnpm worker:smoke:fake
```

Real Photomatix smoke on the host, only after `PHOTOMATIXCL_PATH` is set:

```bash
pnpm worker:smoke:photomatix
```

Real Photomatix smoke in Docker:

```bash
docker compose --profile worker run --rm hdr-worker pnpm worker:smoke:photomatix
```

If the binary or fixtures are absent, the smoke reports `blocked` and names the missing stage. It must not report false success.

## App-Level Photomatix Job

After real smoke passes:

1. Start the normal stack.
2. Upload a local 3-shot JPEG bracket.
3. Approve the detected group.
4. In the HDR job controls, choose `PhotomatixCL`.
5. Process the group.
6. Confirm job status, export rows, and download links.

If `PHOTOMATIXCL_PATH` is missing, Photomatix jobs fail cleanly with:

```text
photomatixcl_missing_or_not_executable
```

The UI explains that PhotomatixCL is not configured and suggests fake mode or setting `PHOTOMATIXCL_PATH`.

## Known Limits

- Trial mode is allowed; output may be watermarked.
- Phase 2D maps one generated JPEG into both MLS and full JPEG export kinds when both are requested.
- Phase 2D does not resize MLS exports separately.
- Phase 2D does not add queue orchestration, reruns, production object storage, Better Auth, OAuth, true MCP, billing, deployment, or runtime AI.

## Current Local Validation Status

As of the Phase 2D checkpoint, real Photomatix validation is blocked because:

- `PHOTOMATIXCL_PATH` is not set in the local env.
- `local-photomatixcl/PhotomatixCL` is not present.
- `local-fixtures/phase-2b/photomatix-smoke/3-shot-jpeg/` is not present.

`pnpm worker:smoke:photomatix` reports `blocked` at the `binary` stage with `photomatixcl_path_missing`. No PhotomatixCL binary, license key, real fixture photo, generated HDR output, or raw secret value was used or committed.

## Next Step

After a real Photomatix smoke and app-level Photomatix job pass, Phase 2E should add output sizing/rerun ergonomics and decide whether queue orchestration is needed before broader RAW validation.
