import { makeShootDeps } from "../../../../lib/shoot-deps";
import { handleCreateShoot, handleListShoots } from "../../../../lib/shoot-route-handlers";

export async function GET(): Promise<Response> {
  return handleListShoots(makeShootDeps());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateShoot(request, makeShootDeps());
}
