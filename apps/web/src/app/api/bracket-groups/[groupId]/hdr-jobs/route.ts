import { requireAdminRequest } from "../../../../../lib/admin-auth";
import {
  handleCreateHdrJobForBracketGroup,
  handleListHdrJobsForBracketGroup
} from "../../../../../lib/hdr-job-route-handlers";
import { makePhase2CDeps } from "../../../../../lib/phase-2c-deps";

type RouteContext = {
  params: Promise<{ groupId: string }> | { groupId: string };
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const params = await context.params;
  return handleListHdrJobsForBracketGroup(params.groupId, makePhase2CDeps());
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const params = await context.params;
  return handleCreateHdrJobForBracketGroup(request, params.groupId, makePhase2CDeps());
}
