import { requireAdminRequest } from "../../../../../lib/admin-auth";
import { handleListExportsForJob } from "../../../../../lib/hdr-job-route-handlers";
import { makePhase2CDeps } from "../../../../../lib/phase-2c-deps";

type RouteContext = {
  params: Promise<{ jobId: string }> | { jobId: string };
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const params = await context.params;
  return handleListExportsForJob(params.jobId, makePhase2CDeps());
}
