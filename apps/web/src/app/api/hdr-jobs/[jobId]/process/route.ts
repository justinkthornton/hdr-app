import { requireAdminRequest } from "../../../../../lib/admin-auth";
import { handleProcessHdrJob } from "../../../../../lib/hdr-job-route-handlers";
import { makePhase2CDeps } from "../../../../../lib/phase-2c-deps";

type RouteContext = {
  params: Promise<{ jobId: string }> | { jobId: string };
};

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const params = await context.params;
  return handleProcessHdrJob(params.jobId, makePhase2CDeps());
}
