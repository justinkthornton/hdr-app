import { requireAdminRequest } from "../../../../../lib/admin-auth";
import { handleListBracketGroupsForShoot } from "../../../../../lib/bracket-route-handlers";
import { makePhase2ADeps } from "../../../../../lib/phase-2a-deps";

type RouteContext = {
  params: Promise<{ shootId: string }> | { shootId: string };
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const params = await context.params;
  return handleListBracketGroupsForShoot(params.shootId, makePhase2ADeps());
}
