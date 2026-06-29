# PhotomatixCL

As of 2026-06-28, the project treats PhotomatixCL as an optional local worker dependency, not as a committed repo artifact.

## Official Source Notes

- HDRsoft’s PhotomatixCL download page lists PhotomatixCL as available for Linux and Windows, including separate Linux builds for ARM and Intel/AMD 64-bit architectures. Source: [HDRsoft PhotomatixCL download](https://www.hdrsoft.com/download/photomatixcl.html).
- HDRsoft describes PhotomatixCL trial mode as non-expiring, with generated images watermarked. Source: [HDRsoft PhotomatixCL download](https://www.hdrsoft.com/download/photomatixcl.html).
- HDRsoft documents license loading with the command shape `PhotomatixCL -ll <license-key>`. Source: [HDRsoft PhotomatixCL download](https://www.hdrsoft.com/download/photomatixcl.html).
- Command details should be checked against HDRsoft’s current PhotomatixCL User Guide before production workflow work. Source: [HDRsoft PhotomatixCL User Guide](https://www.hdrsoft.com/download/PhotomatixCL-UserGuide.pdf).

## Local Apple Silicon Strategy

Do not install PhotomatixCL directly on the Mac host for this project. For local Apple Silicon development, use a Linux ARM Docker worker container.

The project provides:

- `hdr-worker` Docker Compose service behind the `worker` profile.
- `docker/worker.Dockerfile`, based on Linux ARM when run through Compose.
- `docker/install-photomatixcl.sh`, an opt-in helper for explicit download/install attempts.
- `PHOTOMATIXCL_PATH`, pointing to the binary inside the worker container.
- `HDR_ENGINE_MODE`, defaulting to `fake`.
- staged smoke reporting for binary, startup, license, fixture, and render checks.
- automatic `-trial` render mode when no license key is configured.
- opt-in app job processing with `engineMode: "photomatix"`.

The normal app stack does not require PhotomatixCL.

The worker image installs the runtime packages needed by the validated local trial binary:

- `liblensfun1`
- `libcurl3-gnutls`
- `libgomp1`
- `libjpeg62-turbo`
- `libtiff6`
- `liblcms2-2`

## Cloud Strategy Later

Phase 2C or deployment work should use the Linux x86_64 PhotomatixCL build for x86_64 cloud workers. Do not assume the Apple Silicon local binary is the deployment binary.

## Trial And License Handling

Phase 2D uses trial mode automatically when no license is configured. A paid license is not required for fake worker smoke, binary startup validation, or trial smoke validation.

Trial render command shape:

```text
PhotomatixCL -trial -a2 -x Natural -h remove -s jpg -o <outputStem> <input files>
```

Trial output is watermarked.

If `PHOTOMATIX_LICENSE_KEY` exists:

- Load it only inside the Photomatix CLI adapter.
- Use the documented `-ll` command shape.
- Do not add `-trial` to render commands unless that behavior is explicitly changed later.
- Never log, print, paste, commit, or return the raw value.
- Redact the value from command strings, stdout, and stderr.

## Manual Or Mounted Binary Path

The repo must not commit PhotomatixCL binaries. If automated download is not appropriate, download the official Linux ARM archive manually from HDRsoft and mount it into the worker container.

Suggested local layout:

```text
local-photomatixcl/
  PhotomatixCL/
    PhotomatixCL
```

`local-photomatixcl/` is ignored by Git.

Then set:

```bash
PHOTOMATIXCL_PATH=/opt/photomatixcl-local/PhotomatixCL/PhotomatixCL
```

Run the real smoke only after the binary exists:

```bash
docker compose --profile worker run --rm hdr-worker pnpm worker:smoke:photomatix
```

The smoke output redacts local user paths, storage roots, fixture roots, the binary path, and license values. Generated smoke outputs go under:

```text
LOCAL_STORAGE_ROOT/phase-2b-photomatix-smoke/
```

If the binary or fixtures are missing, the smoke reports `blocked` and names the blocked stage.

Manual Docker trial smoke succeeded with this path, aligned images to 100%, fused with `Natural`, and produced a real watermarked JPEG in the ignored worker storage volume. The automated smoke uses a unique output base name by default so stale outputs cannot satisfy the existence check. Photomatix binaries, real fixtures, generated outputs, and license keys must remain uncommitted.

## Optional Download Helper

If HDRsoft’s current download URL is approved for local automation, run the helper inside the worker container with an explicit URL:

```bash
PHOTOMATIXCL_DOWNLOAD_URL=https://www.hdrsoft.com/download/linux/PhotomatixCL-arm-801.tar.gz \
docker compose --profile worker run --rm hdr-worker install-photomatixcl
```

If the URL changes or license/redistribution terms are unclear, do not automate download. Document the blocker and use the manual mount path.
