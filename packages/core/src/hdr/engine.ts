export type HdrRenderRequest = {
  bracketGroupId: string;
  preset: string;
  outputMlsJpeg: boolean;
  outputFullJpeg: boolean;
  outputTiff: boolean;
};

export type HdrRenderResult = {
  jobId: string;
  commandRedacted: string;
  exportKeys: string[];
};

export interface HdrEngine {
  render(request: HdrRenderRequest): Promise<HdrRenderResult>;
}
