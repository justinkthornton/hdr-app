# Phase 2A Local Fixtures

Use this folder as a local staging note for manual upload validation. Do not commit real client photos, large RAW files, generated thumbnails, or generated outputs.

Suggested local-only fixture layout:

```text
fixtures/phase-2a/local/
  canon-r5-7-shot/
  canon-r5-3-shot/
  dji-mini-4k/
local-fixtures/
```

Keep actual image files ignored or outside the repo. Automated tests use tiny synthetic JPEG buffers in code rather than committed client files.

Manual validation targets:

- Use one local non-client 7-shot JPEG bracket set.
- Use one local non-client 3-shot JPEG bracket set.
- Create a shoot for each set or use clearly named test shoots.
- Upload the full set through the admin UI or upload endpoint.
- Confirm every original appears as an asset.
- Confirm readable JPEGs show thumbnails in the asset list and bracket group cards.
- Confirm RAW/TIFF files show file-type placeholders instead of broken images.
- Confirm metadata appears where the source JPEG contains it.
- Confirm the 7-shot set creates one pending-review 7-shot bracket group.
- Confirm the 3-shot set creates one pending-review 3-shot bracket group.
- If both fixture sets are available, upload a mixed 3-shot plus 7-shot batch and confirm it creates two groups without manual sorting.
- Approve and reject groups and confirm the status persists after refresh/readback.
- Confirm the API-key list assets and list groups endpoints work without exposing internal storage keys, thumbnail URLs, or broad raw metadata.

Do not claim real-photo validation has passed until both local fixture sets have been tested on the running app.

RAW fixture validation remains pending.
