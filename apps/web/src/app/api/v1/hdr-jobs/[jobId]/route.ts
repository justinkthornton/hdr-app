import { handleGetHdrJob } from "../../../../../lib/hdr-job-route-handlers";
import { makePhase2CDeps } from "../../../../../lib/phase-2c-deps";

type RouteContext = {
  params: Promise<{ jobId: string }> | { jobId: string };
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleGetHdrJob(params.jobId, makePhase2CDeps(), {
    mode: "api"
  });
}
