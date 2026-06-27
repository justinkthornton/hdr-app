import { isAdminRequest } from "../../../../lib/admin-auth";

export async function GET(request: Request): Promise<Response> {
  return Response.json({
    authenticated: isAdminRequest(request)
  });
}
