import { requireAdminRequest } from "../../../lib/admin-auth";
import { makeShootDeps } from "../../../lib/shoot-deps";
import { handleCreateShoot, handleListShoots } from "../../../lib/shoot-route-handlers";

export async function GET(request: Request): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  return handleListShoots(makeShootDeps());
}

export async function POST(request: Request): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  return handleCreateShoot(request, makeShootDeps());
}
