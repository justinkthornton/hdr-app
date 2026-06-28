# Phase 2B Fixtures

Do not commit real brackets, client photos, generated HDR outputs, or PhotomatixCL binaries.

Use local-only fixtures outside Git:

```text
local-fixtures/phase-2b/photomatix-smoke/3-shot-jpeg/
```

Recommended fixture shape:

- three non-client JPEGs from one bracket
- small enough for a fast smoke test
- no private/client address, identifiable property, or customer data

A 3-shot JPEG set is enough for Phase 2B/2D real Photomatix smoke. Real 7-shot validation can wait for a later phase.

If a local Phase 2A 3-shot fixture set exists, copy or symlink it into the smoke path:

```bash
mkdir -p local-fixtures/phase-2b/photomatix-smoke/3-shot-jpeg
cp local-fixtures/phase-2a/3-shot-jpeg/*.JPG local-fixtures/phase-2b/photomatix-smoke/3-shot-jpeg/
```

Generated Photomatix outputs should go to local storage or another ignored folder, for example:

```text
photomatixcl-output/
local-outputs/
```

Trial output may be watermarked.
