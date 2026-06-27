import { handleListBracketGroupsForShoot } from "../../../../../../lib/bracket-route-handlers";
import { makePhase2ADeps } from "../../../../../../lib/phase-2a-deps";

type RouteContext = {
  params: Promise<{ shootId: string }> | { shootId: string };
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleListBracketGroupsForShoot(params.shootId, makePhase2ADeps());
}
