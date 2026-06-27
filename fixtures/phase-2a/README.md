# Phase 2A Local Fixtures

Use this folder as a local staging note for manual upload validation. Do not commit real client photos, large RAW files, generated thumbnails, or generated outputs.

Suggested local-only fixture layout:

```text
fixtures/phase-2a/local/
  canon-r5-7-shot/
  canon-r5-3-shot/
  dji-mini-4k/
```

Keep actual image files ignored or outside the repo. Automated tests use tiny synthetic JPEG buffers in code rather than committed client files.

Manual validation target:

- create a shoot
- upload a small JPEG bracket set
- confirm assets appear
- confirm bracket groups appear
- approve one group
- reject one group
- confirm the API-key list groups endpoint works

RAW fixture validation remains pending.
