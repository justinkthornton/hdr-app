import { makePhase2ADeps } from "../../../../../../lib/phase-2a-deps";
import { handleUploadFiles } from "../../../../../../lib/upload-route-handlers";

type RouteContext = {
  params: Promise<{ shootId: string }> | { shootId: string };
};

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleUploadFiles(request, params.shootId, makePhase2ADeps());
}
