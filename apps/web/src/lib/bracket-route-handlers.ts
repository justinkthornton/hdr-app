import type { Asset, BracketGroup, BracketGroupStatus } from "@structure-locked-hdr/core";
import { jsonResponse } from "./http";
import {
  serializeAsset,
  serializeBracketGroup,
  type AssetSerializationMode
} from "./phase-2a-serializers";

export type BracketGroupRouteOptions = {
  assetMode?: AssetSerializationMode;
};

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
  deps: BracketGroupRouteDeps,
  options: BracketGroupRouteOptions = {}
): Promise<Response> {
  const assets = await deps.listAssetsForShoot(shootId);

  return jsonResponse({
    assets: assets.map((asset) => serializeAsset(asset, { mode: options.assetMode }))
  });
}

export async function handleListBracketGroupsForShoot(
  shootId: string,
  deps: BracketGroupRouteDeps,
  options: BracketGroupRouteOptions = {}
): Promise<Response> {
  const bracketGroups = await deps.listBracketGroupsForShoot(shootId);

  return jsonResponse({
    bracketGroups: bracketGroups.map((group) =>
      serializeBracketGroup(group, { mode: options.assetMode })
    )
  });
}

export async function handleGetBracketGroup(
  groupId: string,
  deps: BracketGroupRouteDeps,
  options: BracketGroupRouteOptions = {}
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
    bracketGroup: serializeBracketGroup(bracketGroup, { mode: options.assetMode })
  });
}

export async function handleUpdateBracketGroupStatus(
  groupId: string,
  status: BracketGroupStatus,
  deps: BracketGroupRouteDeps,
  options: BracketGroupRouteOptions = {}
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
    bracketGroup: serializeBracketGroup(bracketGroup, { mode: options.assetMode })
  });
}
