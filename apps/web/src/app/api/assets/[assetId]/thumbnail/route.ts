import { makePhase2ADeps } from "../../../../../lib/phase-2a-deps";
import { handleGetAssetThumbnail } from "../../../../../lib/thumbnail-route-handlers";

type RouteContext = {
  params: Promise<{ assetId: string }> | { assetId: string };
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleGetAssetThumbnail(request, params.assetId, makePhase2ADeps());
}
