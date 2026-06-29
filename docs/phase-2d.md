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
- Automatic `-trial` render mode when no `PHOTOMATIX_LICENSE_KEY` is configured.
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

Preferred local extracted folder on the host:

```text
local-photomatixcl/PhotomatixCL/
```

Expected path inside the worker container:

```text
/opt/photomatixcl-local/PhotomatixCL/PhotomatixCL
```

Set:

```bash
PHOTOMATIXCL_PATH=/opt/photomatixcl-local/PhotomatixCL/PhotomatixCL
```

`local-photomatixcl/` is ignored by Git. Do not commit PhotomatixCL binaries or installer archives.

The Docker worker image includes the runtime libraries discovered during manual trial validation:

- `liblensfun1`
- `libcurl3-gnutls`
- `libgomp1`
- `libjpeg62-turbo`
- `libtiff6`
- `liblcms2-2`

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

When no `PHOTOMATIX_LICENSE_KEY` is configured, render commands include `-trial`. Trial output is watermarked. The smoke uses a unique output base name by default and only reports `passed` after the expected output file exists.

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

Manual real PhotomatixCL trial smoke succeeded in the Docker worker after installing the required runtime libraries and using `-trial`.

Observed manual result:

- PhotomatixCL ran in trial mode without a license key.
- PhotomatixCL warned that a watermark would be applied.
- Alignment reached 100%.
- Fusion used the `Natural` preset.
- A real JPEG was saved under the worker storage volume at `phase-2b-photomatix-smoke/manual-trial-smoke.jpg`.
- Output size was approximately 9.5 MB.

The binary, fixture photos, and generated outputs remain local ignored artifacts and must not be committed.

## Next Step

After a real Photomatix smoke and app-level Photomatix job pass, Phase 2E should add output sizing/rerun ergonomics and decide whether queue orchestration is needed before broader RAW validation.
