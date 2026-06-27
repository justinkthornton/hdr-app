import { requireAdminRequest } from "../../../../lib/admin-auth";
import { makeShootDeps } from "../../../../lib/shoot-deps";
import { handleGetShoot, handleUpdateShoot } from "../../../../lib/shoot-route-handlers";

type RouteContext = {
  params: Promise<{ shootId: string }> | { shootId: string };
};

async function getShootId(context: RouteContext): Promise<string> {
  const params = await context.params;
  return params.shootId;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  return handleGetShoot(await getShootId(context), makeShootDeps());
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  return handleUpdateShoot(request, await getShootId(context), makeShootDeps());
}
