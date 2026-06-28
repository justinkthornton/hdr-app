"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ShootDetail = {
  id: string;
  name: string;
  clientName: string | null;
  propertyAddress: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type AssetDetail = {
  id: string;
  originalFilename: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileExt: string;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  cameraModel: string | null;
  lensModel: string | null;
  capturedAt: string | null;
  exposureTime: string | null;
  aperture: string | null;
  iso: number | null;
  exposureBias: string | null;
  rawMetadata: {
    extractionStatus?: string;
    extractionLimitation?: string;
  };
};

type UploadGroupSummary = {
  uploadedPhotoCount: number;
  detectedGroupCount: number;
  detectedSevenShotGroupCount: number;
  detectedThreeShotGroupCount: number;
  ambiguousPhotoCount: number;
};

type BracketGroupDetail = {
  id: string;
  status: "pending_review" | "approved" | "rejected";
  groupIndex: number;
  expectedCount: number;
  detectedCount: number;
  confidence: number;
  groupingReason: string | null;
  assets: (AssetDetail & { sortOrder: number })[];
};

const acceptedFileTypes = ".jpg,.jpeg,.tif,.tiff,.cr3,.cr2,.dng,.arw,.nef,.raf";

function formatDate(value: string | null): string {
  if (!value) {
    return "No capture time";
  }

  return new Date(value).toLocaleString();
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function metadataSummary(asset: AssetDetail): string {
  return [
    asset.exposureTime,
    asset.aperture,
    asset.iso ? `ISO ${asset.iso}` : null,
    asset.exposureBias
  ]
    .filter(Boolean)
    .join(" | ");
}

function statusLabel(status: BracketGroupDetail["status"]): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending_review":
      return "Pending review";
  }
}

function groupTitle(group: BracketGroupDetail): string {
  if (group.confidence < 0.8 || group.detectedCount !== group.expectedCount) {
    return "Ambiguous group";
  }

  if (group.expectedCount === 7) {
    return "7-shot bracket group";
  }

  if (group.expectedCount === 3) {
    return "3-shot bracket group";
  }

  return `${group.expectedCount}-shot bracket group`;
}

function plainGroupingReason(group: BracketGroupDetail): string {
  if (group.confidence < 0.8 || group.detectedCount !== group.expectedCount) {
    return "The app found related photos, but the count or metadata needs human review before HDR processing can trust it.";
  }

  if (group.expectedCount === 7 || group.expectedCount === 3) {
    return "Automatically grouped by EXIF capture time, exposure duration, camera model, and dimensions.";
  }

  return group.groupingReason ?? "Automatically grouped for review.";
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function uploadSummaryLines(summary: UploadGroupSummary): string[] {
  const lines = [pluralize(summary.uploadedPhotoCount, "photo") + " uploaded."];

  if (summary.detectedGroupCount === 0) {
    lines.push(
      "No bracket groups detected. This usually means EXIF capture time is missing, files were too far apart, or metadata differs."
    );
    return lines;
  }

  lines.push(pluralize(summary.detectedGroupCount, "bracket group") + " detected.");

  if (summary.detectedSevenShotGroupCount > 0) {
    lines.push(
      summary.detectedSevenShotGroupCount === 1
        ? "Detected one 7-shot group."
        : `Detected ${summary.detectedSevenShotGroupCount} 7-shot groups.`
    );
  }

  if (summary.detectedThreeShotGroupCount > 0) {
    lines.push(
      summary.detectedThreeShotGroupCount === 1
        ? "Detected one 3-shot group."
        : `Detected ${summary.detectedThreeShotGroupCount} 3-shot groups.`
    );
  }

  if (summary.ambiguousPhotoCount > 0) {
    lines.push(`${summary.ambiguousPhotoCount} photos need review.`);
  }

  return lines;
}

function uploadErrorMessage(error: string | undefined): string {
  switch (error) {
    case "too_many_files":
      return "Too many files selected for one upload. Split the batch and try again.";
    case "file_too_large":
      return "One file is larger than the local upload limit.";
    case "batch_too_large":
      return "This batch is larger than the local upload limit. Split it into smaller uploads.";
    case "unsupported_file_type":
      return "One or more files are not supported yet. Use JPG, JPEG, TIF, TIFF, CR3, CR2, DNG, ARW, NEF, or RAF.";
    case "upload_failed":
      return "Upload failed after it started. Stored preview files were cleaned up where possible; try the batch again.";
    default:
      return "Upload failed. Check file types and try again.";
  }
}

function AssetPreview({
  asset,
  compact = false
}: {
  asset: AssetDetail;
  compact?: boolean;
}): React.ReactElement {
  if (asset.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Protected admin thumbnails rely on the browser's session cookie.
      <img
        alt={`Preview of ${asset.originalFilename}`}
        className={compact ? "asset-thumb compact-thumb" : "asset-thumb"}
        src={asset.thumbnailUrl}
      />
    );
  }

  return (
    <div className={compact ? "file-preview compact-thumb" : "file-preview"}>
      <span>{asset.fileExt.replace(".", "").toUpperCase()}</span>
    </div>
  );
}

export default function ShootDetailClient({ shootId }: { shootId: string }): React.ReactElement {
  const [shoot, setShoot] = useState<ShootDetail | null>(null);
  const [assets, setAssets] = useState<AssetDetail[]>([]);
  const [bracketGroups, setBracketGroups] = useState<BracketGroupDetail[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadGroupSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [reviewingGroupId, setReviewingGroupId] = useState<string | null>(null);

  const selectedFileSummary = useMemo(() => {
    if (selectedFiles.length === 0) {
      return "No files selected.";
    }

    const totalBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
    return `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected, ${formatBytes(totalBytes)} total.`;
  }, [selectedFiles]);

  async function loadShoot(): Promise<void> {
    setIsLoading(true);
    setError(null);
    const [shootResponse, assetsResponse, groupsResponse] = await Promise.all([
      fetch(`/api/shoots/${shootId}`),
      fetch(`/api/shoots/${shootId}/assets`),
      fetch(`/api/shoots/${shootId}/bracket-groups`)
    ]);

    if (
      [shootResponse, assetsResponse, groupsResponse].some((response) => response.status === 401)
    ) {
      window.location.assign("/login");
      return;
    }

    if (!shootResponse.ok || !assetsResponse.ok || !groupsResponse.ok) {
      setError("Shoot detail could not be loaded.");
      setIsLoading(false);
      return;
    }

    const shootBody = (await shootResponse.json()) as { shoot: ShootDetail };
    const assetsBody = (await assetsResponse.json()) as { assets: AssetDetail[] };
    const groupsBody = (await groupsResponse.json()) as { bracketGroups: BracketGroupDetail[] };
    setShoot(shootBody.shoot);
    setAssets(assetsBody.assets);
    setBracketGroups(groupsBody.bracketGroups);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadShoot();
  }, [shootId]);

  async function uploadFiles(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setUploadStatus("Select files before uploading.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Uploading originals and detecting bracket groups...");
    setUploadSummary(null);
    setError(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));

    const response = await fetch(`/api/shoots/${shootId}/uploads`, {
      method: "POST",
      body: formData
    });

    setIsUploading(false);

    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setUploadStatus(uploadErrorMessage(body.error));
      return;
    }

    const body = (await response.json()) as {
      groupSummary: UploadGroupSummary;
      assets: AssetDetail[];
      bracketGroups: BracketGroupDetail[];
    };
    setSelectedFiles([]);
    setUploadStatus(null);
    setUploadSummary(body.groupSummary);
    await loadShoot();
  }

  async function updateGroupStatus(groupId: string, action: "approve" | "reject"): Promise<void> {
    setReviewingGroupId(groupId);
    const response = await fetch(`/api/bracket-groups/${groupId}/${action}`, {
      method: "POST"
    });
    setReviewingGroupId(null);

    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }

    if (!response.ok) {
      setError("Bracket group status could not be updated.");
      return;
    }

    await loadShoot();
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <h1>{shoot?.name ?? "Shoot detail"}</h1>
          <p>Phase 2A upload and bracket review</p>
        </div>
        <Link href="/dashboard">
          <button className="secondary" type="button">
            Back
          </button>
        </Link>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {isLoading ? <p className="muted">Loading shoot...</p> : null}

      {shoot ? (
        <>
          <section className="panel detail-panel">
            <p className="muted">
              {[shoot.clientName, shoot.propertyAddress].filter(Boolean).join(" | ") ||
                "Client and property address are not set."}
            </p>
            {shoot.notes ? <p>{shoot.notes}</p> : null}
            {shoot.tags.length > 0 ? (
              <div className="tag-row">
                {shoot.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="workflow-panel">
            <div className="workflow-step active">
              <span>Step 1</span>
              <strong>Upload photos</strong>
            </div>
            <div className="workflow-step active">
              <span>Step 2</span>
              <strong>Review detected groups</strong>
            </div>
            <div className="workflow-step active">
              <span>Step 3</span>
              <strong>Approve groups</strong>
            </div>
            <div className="workflow-step future">
              <span>Step 4</span>
              <strong>HDR processing coming in next phase</strong>
            </div>
          </section>
        </>
      ) : null}

      <section className="detail-grid">
        <form className="panel form-grid" onSubmit={uploadFiles}>
          <h2>Step 1: Upload photos</h2>
          <p className="muted">
            Upload all photos from a shoot or bracket batch. The app automatically groups 3-shot and
            7-shot brackets using EXIF capture time, exposure duration, camera model, and
            dimensions. You only need to review the detected groups.
          </p>
          <div className="form-row">
            <label htmlFor="files">Original files</label>
            <input
              id="files"
              type="file"
              multiple
              accept={acceptedFileTypes}
              onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
            />
          </div>
          <p className="muted">{selectedFileSummary}</p>
          <p className="muted">
            JPEG files get local thumbnails. RAW/TIFF files are stored with file-type placeholders
            for now.
          </p>
          <p className="muted">Accepted: JPG, JPEG, TIF, TIFF, CR3, CR2, DNG, ARW, NEF, RAF.</p>
          {uploadStatus ? <p>{uploadStatus}</p> : null}
          {uploadSummary ? (
            <div
              className={
                uploadSummary.detectedGroupCount > 0
                  ? "upload-result success"
                  : "upload-result warning"
              }
            >
              <strong>
                {uploadSummary.detectedGroupCount > 0
                  ? "Upload complete"
                  : "Upload complete, no groups detected"}
              </strong>
              <ul>
                {uploadSummaryLines(uploadSummary).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <button type="submit" disabled={isUploading || selectedFiles.length === 0}>
            {isUploading ? "Uploading..." : "Upload batch"}
          </button>
        </form>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Uploaded photos</h2>
              {assets.length > 0 ? (
                <p className="muted">
                  Diagnostics help explain why automatic grouping worked or failed.
                </p>
              ) : null}
            </div>
          </div>
          {assets.length === 0 ? (
            <p className="empty-state">Upload bracket photos to begin.</p>
          ) : null}
          <div className="asset-list">
            {assets.map((asset) => (
              <article className="asset-row" key={asset.id}>
                <AssetPreview asset={asset} />
                <div>
                  <strong>{asset.originalFilename}</strong>
                  <p className="muted">
                    {[formatDate(asset.capturedAt), asset.cameraModel, asset.lensModel]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                  <p className="muted">
                    {[
                      asset.width && asset.height ? `${asset.width}x${asset.height}` : null,
                      metadataSummary(asset)
                    ]
                      .filter(Boolean)
                      .join(" | ") || "Metadata pending or unavailable."}
                  </p>
                  <details className="diagnostics">
                    <summary>Diagnostics</summary>
                    <dl>
                      <div>
                        <dt>Capture time</dt>
                        <dd>{formatDate(asset.capturedAt)}</dd>
                      </div>
                      <div>
                        <dt>Exposure time</dt>
                        <dd>{asset.exposureTime ?? "Missing"}</dd>
                      </div>
                      <div>
                        <dt>Camera model</dt>
                        <dd>{asset.cameraModel ?? "Missing"}</dd>
                      </div>
                      <div>
                        <dt>Dimensions</dt>
                        <dd>
                          {asset.width && asset.height
                            ? `${asset.width}x${asset.height}`
                            : "Missing"}
                        </dd>
                      </div>
                      <div>
                        <dt>Extraction status</dt>
                        <dd>{asset.rawMetadata.extractionStatus ?? "unknown"}</dd>
                      </div>
                    </dl>
                  </details>
                </div>
                <div className="asset-meta">
                  <span className="tag">{asset.fileExt.replace(".", "").toUpperCase()}</span>
                  <span className="tag">{formatBytes(asset.fileSizeBytes)}</span>
                  <span className="tag">{asset.rawMetadata.extractionStatus ?? "unknown"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel groups-panel">
        <div className="section-heading">
          <div>
            <h2>Step 2 and 3: Review detected groups</h2>
            {bracketGroups.some((group) => group.status === "pending_review") ? (
              <p className="muted">Review detected groups below.</p>
            ) : null}
            {bracketGroups.length > 0 &&
            bracketGroups.every((group) => group.status === "approved") ? (
              <p className="muted">
                Approved groups are ready for HDR processing in the next phase.
              </p>
            ) : null}
          </div>
        </div>
        {bracketGroups.length === 0 && assets.length === 0 ? (
          <p className="empty-state">
            No candidate groups yet. Upload a batch to detect 7-shot and 3-shot brackets.
          </p>
        ) : null}
        {bracketGroups.length === 0 && assets.length > 0 ? (
          <p className="empty-state warning">
            Photos uploaded, but no bracket groups were detected. Check capture time, exposure time,
            camera model, and dimensions in the diagnostics above.
          </p>
        ) : null}
        <div className="group-list">
          {bracketGroups.map((group) => (
            <article className={`group-card status-${group.status}`} key={group.id}>
              <div className="group-header">
                <div>
                  <h3>{groupTitle(group)}</h3>
                  <p className="muted">
                    Group {group.groupIndex} | {group.detectedCount} of {group.expectedCount} photos
                    | confidence {Math.round(group.confidence * 100)}%
                  </p>
                </div>
                <span className="status-pill">{statusLabel(group.status)}</span>
              </div>
              <p>{plainGroupingReason(group)}</p>
              <div className="thumbnail-strip">
                {group.assets.map((asset) => (
                  <div className="thumbnail-strip-item" key={asset.id}>
                    <AssetPreview asset={asset} compact />
                    <span>{asset.sortOrder}</span>
                  </div>
                ))}
              </div>
              <div className="group-assets">
                {group.assets.map((asset) => (
                  <div className="group-asset" key={asset.id}>
                    <span>{asset.sortOrder}</span>
                    <div>
                      <strong>{asset.originalFilename}</strong>
                      <p className="muted">
                        {[formatDate(asset.capturedAt), metadataSummary(asset)]
                          .filter(Boolean)
                          .join(" | ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="review-actions">
                <button
                  type="button"
                  disabled={reviewingGroupId === group.id}
                  onClick={() => void updateGroupStatus(group.id, "approve")}
                >
                  Approve group
                </button>
                <button
                  className="danger"
                  type="button"
                  disabled={reviewingGroupId === group.id}
                  onClick={() => void updateGroupStatus(group.id, "reject")}
                >
                  Reject group
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
