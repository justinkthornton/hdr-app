export const bracketGroupStatuses = ["pending_review", "approved", "rejected"] as const;
export type BracketGroupStatus = (typeof bracketGroupStatuses)[number];

export const jobStatuses = ["queued", "running", "succeeded", "failed", "canceled"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const uploadBatchStatuses = ["created", "uploaded", "grouping_ready"] as const;
export type UploadBatchStatus = (typeof uploadBatchStatuses)[number];

export const exportKinds = ["mls_jpeg", "full_jpeg", "tiff"] as const;
export type ExportKind = (typeof exportKinds)[number];
