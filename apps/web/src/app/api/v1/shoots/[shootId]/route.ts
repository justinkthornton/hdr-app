import { makeShootDeps } from "../../../../../lib/shoot-deps";
import { handleGetShoot } from "../../../../../lib/shoot-route-handlers";

type RouteContext = {
  params: Promise<{ shootId: string }> | { shootId: string };
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleGetShoot(params.shootId, makeShootDeps());
}
