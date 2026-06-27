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

export default function ShootDetailClient({ shootId }: { shootId: string }): React.ReactElement {
  const [shoot, setShoot] = useState<ShootDetail | null>(null);
  const [assets, setAssets] = useState<AssetDetail[]>([]);
  const [bracketGroups, setBracketGroups] = useState<BracketGroupDetail[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
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
      setUploadStatus("Upload failed. Check file types and try again.");
      return;
    }

    const body = (await response.json()) as {
      assets: AssetDetail[];
      bracketGroups: BracketGroupDetail[];
    };
    setSelectedFiles([]);
    setUploadStatus(
      `Uploaded ${body.assets.length} file${body.assets.length === 1 ? "" : "s"} and detected ${body.bracketGroups.length} candidate group${body.bracketGroups.length === 1 ? "" : "s"}.`
    );
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
      ) : null}

      <section className="detail-grid">
        <form className="panel form-grid" onSubmit={uploadFiles}>
          <h2>Batch upload</h2>
          <p className="muted">
            JPEG previews are metadata-ready now. RAW files are stored for later parser coverage.
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
          <p className="muted">Accepted: JPG, JPEG, TIF, TIFF, CR3, CR2, DNG, ARW, NEF, RAF.</p>
          {uploadStatus ? <p>{uploadStatus}</p> : null}
          <button type="submit" disabled={isUploading || selectedFiles.length === 0}>
            {isUploading ? "Uploading..." : "Upload batch"}
          </button>
        </form>

        <section className="panel">
          <h2>Assets</h2>
          {assets.length === 0 ? <p className="muted">No uploaded assets yet.</p> : null}
          <div className="asset-list">
            {assets.map((asset) => (
              <article className="asset-row" key={asset.id}>
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
        <h2>Bracket groups</h2>
        {bracketGroups.length === 0 ? (
          <p className="muted">
            No candidate groups yet. Upload a batch to detect 7-shot and 3-shot brackets.
          </p>
        ) : null}
        <div className="group-list">
          {bracketGroups.map((group) => (
            <article className={`group-card status-${group.status}`} key={group.id}>
              <div className="group-header">
                <div>
                  <h3>Group {group.groupIndex}</h3>
                  <p className="muted">
                    {group.detectedCount}/{group.expectedCount} files | confidence{" "}
                    {Math.round(group.confidence * 100)}%
                  </p>
                </div>
                <span className="status-pill">{group.status.replace("_", " ")}</span>
              </div>
              {group.groupingReason ? <p>{group.groupingReason}</p> : null}
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
                  Approve
                </button>
                <button
                  className="danger"
                  type="button"
                  disabled={reviewingGroupId === group.id}
                  onClick={() => void updateGroupStatus(group.id, "reject")}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
