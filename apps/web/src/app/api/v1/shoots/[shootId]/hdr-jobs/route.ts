import { handleListHdrJobsForShoot } from "../../../../../../lib/hdr-job-route-handlers";
import { makePhase2CDeps } from "../../../../../../lib/phase-2c-deps";

type RouteContext = {
  params: Promise<{ shootId: string }> | { shootId: string };
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleListHdrJobsForShoot(params.shootId, makePhase2CDeps(), {
    mode: "api"
  });
}
