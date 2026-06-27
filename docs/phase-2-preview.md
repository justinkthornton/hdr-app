# Phase 2 Preview

Phase 2 should add the HDR pipeline without changing the structure-locked premise.

## Uploads

- Batch upload originals into the storage adapter.
- Record assets with storage key, filename, MIME type, file size, dimensions, and EXIF fields.
- Keep local storage first, with object storage as a future adapter.

## EXIF Extraction

- Extract capture time, camera model, lens model, exposure time, aperture, ISO, and exposure bias.
- Preserve raw metadata in `assets.raw_metadata`.
- Do not modify original files during metadata extraction.

## Grouping

- Support Canon EOS R5 RAW/JPEG 7-shot brackets.
- Support Canon EOS R5 RAW/JPEG 3-shot brackets.
- Support DJI Mini 4K class RAW/JPEG brackets.
- Group by EXIF capture time and exposure characteristics.
- Store confidence and grouping reason.

## Review UI

- Show detected bracket groups.
- Let the admin approve, reject, or adjust groups.
- Keep review state in `bracket_groups`.

## PhotomatixCL Worker

- Add a worker service after the grouping and review contracts are stable.
- Use `HdrEngine` as the integration seam.
- Store redacted command text in `hdr_jobs.command_redacted`.
- Do not log license keys or raw secrets.

## Exports

- Generate MLS JPEG.
- Generate full JPEG.
- Optionally generate TIFF.
- Store export metadata in `exports`.

## Fixture Testing

- Start with small JPEG fixtures.
- Add RAW fixtures later once fixture storage and repository rules are clear.
