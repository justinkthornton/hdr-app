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
- Phase 2C creates app-level HDR jobs and runs fake processing through the engine seam.
- Phase 2D adds staged PhotomatixCL smoke reporting and opt-in Photomatix job processing.

## Exports

- Phase 2C creates fake placeholder export files and stores export metadata in `exports`.
- Phase 2D imports a produced Photomatix output into export records when the real engine is available.
- Later work should add separate MLS sizing, full-size output handling, and optional TIFF variants.
- Do not commit generated real HDR outputs.

## Job Orchestration

- Phase 2C uses a process-now route for local MVP validation.
- Phase 2D keeps the same process-now route for fake and opt-in Photomatix jobs.
- Later work should add worker claiming of queued jobs, reruns, and stronger job event history.

## Fixture Testing

- Start with small JPEG fixtures.
- Add RAW fixtures later once fixture storage and repository rules are clear.
