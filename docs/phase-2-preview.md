# Phase 2 Preview

Phase 2 should add the HDR pipeline without changing the structure-locked premise.

## Uploads

- Phase 2A implemented batch upload originals into the storage adapter.
- Phase 2A records assets with storage key, filename, MIME type, file size, dimensions, and EXIF fields when available.
- Keep local storage first, with object storage as a future adapter.

## EXIF Extraction

- Phase 2A extracts JPEG capture time, camera model, lens model, exposure time, aperture, ISO, exposure bias, width, and height when present.
- RAW/TIFF files are accepted and stored now; RAW metadata support remains fixture-pending.
- Preserve raw metadata in `assets.raw_metadata`.
- Do not modify original files during metadata extraction.

## Grouping

- Support Canon EOS R5 RAW/JPEG 7-shot brackets.
- Support Canon EOS R5 RAW/JPEG 3-shot brackets.
- Support DJI Mini 4K class RAW/JPEG brackets.
- Group by EXIF capture time and exposure characteristics.
- Phase 2A stores confidence and grouping reason.

## Review UI

- Phase 2A shows detected bracket groups.
- Phase 2A lets the admin approve or reject groups.
- Manual group adjustment is still planned.
- Keep review state in `bracket_groups`.

## PhotomatixCL Worker

- Phase 2B adds a profiled Docker `hdr-worker` smoke service and `HdrEngine` implementations.
- Keep normal app startup independent from the worker profile.
- Use `FakeHdrEngine` for deterministic tests.
- Use `PhotomatixCliEngine` for the future real PhotomatixCL call path.
- Store redacted command text in `hdr_jobs.command_redacted`.
- Do not log license keys or raw secrets.
- Do not create app-level HDR jobs until Phase 2C.

## Exports

- Generate MLS JPEG.
- Generate full JPEG.
- Optionally generate TIFF.
- Store export metadata in `exports`.

## Fixture Testing

- Start with small JPEG fixtures.
- Add RAW fixtures later once fixture storage and repository rules are clear.
