# Fixtures

Phase 2A uses synthetic in-code JPEG metadata fixtures for automated tests. Real local bracket fixtures are intentionally not committed.

## Phase 2 Fixture Strategy

- Use small JPEG fixtures first for upload and metadata smoke tests.
- Add local user-provided JPEG fixtures under `fixtures/phase-2a/` for manual validation.
- Add RAW fixtures later after storage, fixture retention, and repository-size rules are settled.

Planned fixture families:

- Canon EOS R5 RAW + JPEG 7-shot bracket set.
- Canon EOS R5 RAW + JPEG 3-shot bracket set.
- DJI Mini 4K class RAW + JPEG bracket set.

Do not commit client photos, generated outputs, or large RAW files without an explicit fixture policy.
