import { handleUpdateBracketGroupStatus } from "../../../../../../lib/bracket-route-handlers";
import { makePhase2ADeps } from "../../../../../../lib/phase-2a-deps";

type RouteContext = {
  params: Promise<{ groupId: string }> | { groupId: string };
};

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleUpdateBracketGroupStatus(params.groupId, "approved", makePhase2ADeps());
}
