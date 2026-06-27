import type { Asset, BracketGroup, BracketGroupStatus } from "@structure-locked-hdr/core";
import { jsonResponse } from "./http";
import { serializeAsset, serializeBracketGroup } from "./phase-2a-serializers";

export type BracketGroupRouteDeps = {
  listAssetsForShoot(shootId: string): Promise<Asset[]>;
  listBracketGroupsForShoot(shootId: string): Promise<BracketGroup[]>;
  getBracketGroupWithAssets(groupId: string): Promise<BracketGroup | null>;
  updateBracketGroupStatus(
    groupId: string,
    status: BracketGroupStatus
  ): Promise<BracketGroup | null>;
};

export async function handleListAssetsForShoot(
  shootId: string,
  deps: BracketGroupRouteDeps
): Promise<Response> {
  const assets = await deps.listAssetsForShoot(shootId);

  return jsonResponse({
    assets: assets.map(serializeAsset)
  });
}

export async function handleListBracketGroupsForShoot(
  shootId: string,
  deps: BracketGroupRouteDeps
): Promise<Response> {
  const bracketGroups = await deps.listBracketGroupsForShoot(shootId);

  return jsonResponse({
    bracketGroups: bracketGroups.map(serializeBracketGroup)
  });
}

export async function handleGetBracketGroup(
  groupId: string,
  deps: BracketGroupRouteDeps
): Promise<Response> {
  const bracketGroup = await deps.getBracketGroupWithAssets(groupId);

  if (!bracketGroup) {
    return jsonResponse(
      {
        error: "bracket_group_not_found"
      },
      {
        status: 404
      }
    );
  }

  return jsonResponse({
    bracketGroup: serializeBracketGroup(bracketGroup)
  });
}

export async function handleUpdateBracketGroupStatus(
  groupId: string,
  status: BracketGroupStatus,
  deps: BracketGroupRouteDeps
): Promise<Response> {
  const bracketGroup = await deps.updateBracketGroupStatus(groupId, status);

  if (!bracketGroup) {
    return jsonResponse(
      {
        error: "bracket_group_not_found"
      },
      {
        status: 404
      }
    );
  }

  return jsonResponse({
    bracketGroup: serializeBracketGroup(bracketGroup)
  });
}
