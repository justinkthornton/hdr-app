import type { Asset } from "../domain/uploads";

export type CandidateBracketGroup = {
  status: "pending_review";
  groupIndex: number;
  expectedCount: number;
  detectedCount: number;
  confidence: number;
  groupingReason: string;
  assetIds: string[];
};

const closeCaptureGapMs = 2500;

function partitionKey(asset: Asset): string {
  return [
    asset.shootId,
    asset.uploadBatchId ?? "no-batch",
    asset.cameraModel ?? "unknown-camera",
    asset.width ?? "unknown-width",
    asset.height ?? "unknown-height"
  ].join("|");
}

function sortAssets(left: Asset, right: Asset): number {
  const leftTime = left.capturedAt?.getTime();
  const rightTime = right.capturedAt?.getTime();

  if (leftTime !== undefined && rightTime !== undefined && leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  if (leftTime !== undefined && rightTime === undefined) {
    return -1;
  }

  if (leftTime === undefined && rightTime !== undefined) {
    return 1;
  }

  return left.originalFilename.localeCompare(right.originalFilename);
}

function confidenceFor(expectedCount: number, assets: Asset[], ambiguous: boolean): number {
  if (ambiguous) {
    return assets.every((asset) => asset.capturedAt) ? 0.55 : 0.3;
  }

  const hasUsefulMetadata = assets.every(
    (asset) => asset.capturedAt && asset.cameraModel && asset.width && asset.height
  );

  if (expectedCount === 7) {
    return hasUsefulMetadata ? 0.95 : 0.9;
  }

  return hasUsefulMetadata ? 0.88 : 0.82;
}

function makeGroup(
  groupIndex: number,
  expectedCount: number,
  assets: Asset[],
  reason: string,
  ambiguous = false
): CandidateBracketGroup {
  return {
    status: "pending_review",
    groupIndex,
    expectedCount,
    detectedCount: assets.length,
    confidence: confidenceFor(expectedCount, assets, ambiguous),
    groupingReason: reason,
    assetIds: assets.map((asset) => asset.id)
  };
}

function clusterByTime(assets: Asset[]): Asset[][] {
  const clusters: Asset[][] = [];
  let current: Asset[] = [];

  for (const asset of assets) {
    const previous = current[current.length - 1];

    if (
      previous?.capturedAt &&
      asset.capturedAt &&
      asset.capturedAt.getTime() - previous.capturedAt.getTime() > closeCaptureGapMs
    ) {
      clusters.push(current);
      current = [];
    }

    current.push(asset);
  }

  if (current.length > 0) {
    clusters.push(current);
  }

  return clusters;
}

function consumeCluster(
  cluster: Asset[],
  groups: CandidateBracketGroup[],
  nextGroupIndex: () => number
): void {
  let offset = 0;

  while (cluster.length - offset >= 7) {
    groups.push(
      makeGroup(
        nextGroupIndex(),
        7,
        cluster.slice(offset, offset + 7),
        "Detected clean 7-shot bracket by close EXIF capture times and matching camera/dimensions."
      )
    );
    offset += 7;
  }

  while (cluster.length - offset >= 3) {
    groups.push(
      makeGroup(
        nextGroupIndex(),
        3,
        cluster.slice(offset, offset + 3),
        "Detected clean 3-shot bracket by close EXIF capture times and matching camera/dimensions."
      )
    );
    offset += 3;
  }

  const remaining = cluster.slice(offset);

  if (remaining.length > 0) {
    groups.push(
      makeGroup(
        nextGroupIndex(),
        remaining.length >= 4 ? 7 : 3,
        remaining,
        "Ambiguous unmatched capture cluster outside the expected 3-shot or 7-shot bracket counts.",
        true
      )
    );
  }
}

export function groupAssetsForUploadBatch(assets: Asset[]): CandidateBracketGroup[] {
  const partitions = new Map<string, Asset[]>();

  for (const asset of assets) {
    if (!asset.uploadBatchId) {
      continue;
    }

    const key = partitionKey(asset);
    partitions.set(key, [...(partitions.get(key) ?? []), asset]);
  }

  let groupIndex = 0;
  const nextGroupIndex = (): number => {
    groupIndex += 1;
    return groupIndex;
  };
  const groups: CandidateBracketGroup[] = [];

  for (const partition of [...partitions.values()]) {
    const sorted = [...partition].sort(sortAssets);
    const withCaptureTime = sorted.filter((asset) => asset.capturedAt);
    const withoutCaptureTime = sorted.filter((asset) => !asset.capturedAt);

    for (const cluster of clusterByTime(withCaptureTime)) {
      consumeCluster(cluster, groups, nextGroupIndex);
    }

    if (withoutCaptureTime.length > 0) {
      groups.push(
        makeGroup(
          nextGroupIndex(),
          withoutCaptureTime.length === 7 ? 7 : 3,
          withoutCaptureTime,
          "Missing EXIF capture time; grouped for manual review only.",
          true
        )
      );
    }
  }

  return groups.sort((left, right) => left.groupIndex - right.groupIndex);
}
