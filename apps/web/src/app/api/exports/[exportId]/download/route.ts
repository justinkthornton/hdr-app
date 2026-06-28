import { requireAdminRequest } from "../../../../../lib/admin-auth";
import { handleDownloadExport } from "../../../../../lib/hdr-job-route-handlers";
import { makePhase2CDeps } from "../../../../../lib/phase-2c-deps";

type RouteContext = {
  params: Promise<{ exportId: string }> | { exportId: string };
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const params = await context.params;
  return handleDownloadExport(params.exportId, makePhase2CDeps());
}
