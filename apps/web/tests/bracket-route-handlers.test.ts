import { describe, expect, it } from "vitest";
import type { Asset, BracketGroup } from "@structure-locked-hdr/core";
import { requireAdminRequest } from "../src/lib/admin-auth";
import {
  handleGetBracketGroup,
  handleListAssetsForShoot,
  handleListBracketGroupsForShoot,
  handleUpdateBracketGroupStatus,
  type BracketGroupRouteDeps
} from "../src/lib/bracket-route-handlers";

const asset: Asset = {
  id: "asset-1",
  shootId: "shoot-1",
  uploadBatchId: "batch-1",
  originalFilename: "front.jpg",
  storageKey: "shoots/shoot-1/uploads/batch-1/originals/asset-1-front.jpg",
  mimeType: "image/jpeg",
  fileExt: ".jpg",
  fileSizeBytes: 1000,
  width: 1920,
  height: 1080,
  cameraModel: "Canon EOS R5",
  lensModel: null,
  capturedAt: new Date("2026-06-27T12:00:00Z"),
  exposureTime: "1/125",
  aperture: "f/8",
  iso: 200,
  exposureBias: null,
  rawMetadata: {},
  createdAt: new Date("2026-06-27T12:00:00Z")
};

function group(status: BracketGroup["status"] = "pending_review"): BracketGroup {
  return {
    id: "group-1",
    shootId: "shoot-1",
    uploadBatchId: "batch-1",
    status,
    groupIndex: 1,
    expectedCount: 3,
    detectedCount: 1,
    confidence: 0.3,
    groupingReason: "Missing EXIF capture time; grouped for manual review only.",
    reviewedAt: status === "pending_review" ? null : new Date("2026-06-27T12:01:00Z"),
    approvedAt: status === "approved" ? new Date("2026-06-27T12:01:00Z") : null,
    createdAt: new Date("2026-06-27T12:00:00Z"),
    assets: [
      {
        ...asset,
        sortOrder: 1
      }
    ]
  };
}

const deps: BracketGroupRouteDeps = {
  listAssetsForShoot: async () => [asset],
  listBracketGroupsForShoot: async () => [group()],
  getBracketGroupWithAssets: async (groupId) => (groupId === "group-1" ? group() : null),
  updateBracketGroupStatus: async (groupId, status) =>
    groupId === "group-1" ? group(status) : null
};

describe("bracket review route handlers", () => {
  it("lists shoot assets", async () => {
    const response = await handleListAssetsForShoot("shoot-1", deps);
    const body = (await response.json()) as { assets: Asset[] };

    expect(body.assets).toHaveLength(1);
  });

  it("lists bracket groups", async () => {
    const response = await handleListBracketGroupsForShoot("shoot-1", deps);
    const body = (await response.json()) as { bracketGroups: BracketGroup[] };

    expect(body.bracketGroups[0]?.id).toBe("group-1");
  });

  it("gets one bracket group", async () => {
    const response = await handleGetBracketGroup("group-1", deps);
    const body = (await response.json()) as { bracketGroup: BracketGroup };

    expect(body.bracketGroup.assets).toHaveLength(1);
  });

  it("approves and rejects bracket groups", async () => {
    const approved = await handleUpdateBracketGroupStatus("group-1", "approved", deps);
    const rejected = await handleUpdateBracketGroupStatus("group-1", "rejected", deps);
    const approvedBody = (await approved.json()) as { bracketGroup: BracketGroup };
    const rejectedBody = (await rejected.json()) as { bracketGroup: BracketGroup };

    expect(approvedBody.bracketGroup.status).toBe("approved");
    expect(rejectedBody.bracketGroup.status).toBe("rejected");
  });

  it("rejects unauthorized admin review requests", () => {
    process.env.ADMIN_SESSION_SECRET = "test-session-secret-at-least-32-characters";

    const response = requireAdminRequest(
      new Request("http://localhost/api/bracket-groups/group-1")
    );

    expect(response?.status).toBe(401);
  });
});
