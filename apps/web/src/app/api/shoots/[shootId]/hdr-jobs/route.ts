import { requireAdminRequest } from "../../../../../lib/admin-auth";
import { makePhase2CDeps } from "../../../../../lib/phase-2c-deps";
import { handleListHdrJobsForShoot } from "../../../../../lib/hdr-job-route-handlers";

type RouteContext = {
  params: Promise<{ shootId: string }> | { shootId: string };
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const params = await context.params;
  return handleListHdrJobsForShoot(params.shootId, makePhase2CDeps());
}
