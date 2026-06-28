import {
  handleCreateHdrJobForBracketGroup,
  handleListHdrJobsForBracketGroup
} from "../../../../../../lib/hdr-job-route-handlers";
import { makePhase2CDeps } from "../../../../../../lib/phase-2c-deps";

type RouteContext = {
  params: Promise<{ groupId: string }> | { groupId: string };
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleListHdrJobsForBracketGroup(params.groupId, makePhase2CDeps(), {
    mode: "api"
  });
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleCreateHdrJobForBracketGroup(request, params.groupId, makePhase2CDeps(), {
    mode: "api"
  });
}
