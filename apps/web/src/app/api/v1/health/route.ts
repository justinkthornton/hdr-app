export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    service: "structure-locked-hdr-service",
    phase: "phase-1",
    pipelineEnabled: false
  });
}
