import { requireAdminRequest } from "../../../../../lib/admin-auth";
import { handleUpdateBracketGroupStatus } from "../../../../../lib/bracket-route-handlers";
import { makePhase2ADeps } from "../../../../../lib/phase-2a-deps";

type RouteContext = {
  params: Promise<{ groupId: string }> | { groupId: string };
};

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const params = await context.params;
  return handleUpdateBracketGroupStatus(params.groupId, "rejected", makePhase2ADeps());
}
