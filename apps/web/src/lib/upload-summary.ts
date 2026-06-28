import type { BracketGroup } from "@structure-locked-hdr/core";

export type UploadGroupSummary = {
  uploadedPhotoCount: number;
  detectedGroupCount: number;
  detectedSevenShotGroupCount: number;
  detectedThreeShotGroupCount: number;
  ambiguousPhotoCount: number;
};

function isAmbiguousGroup(group: BracketGroup): boolean {
  return group.confidence < 0.8 || group.detectedCount !== group.expectedCount;
}

export function buildUploadGroupSummary(input: {
  uploadedPhotoCount: number;
  bracketGroups: BracketGroup[];
}): UploadGroupSummary {
  return {
    uploadedPhotoCount: input.uploadedPhotoCount,
    detectedGroupCount: input.bracketGroups.length,
    detectedSevenShotGroupCount: input.bracketGroups.filter(
      (group) => group.expectedCount === 7 && !isAmbiguousGroup(group)
    ).length,
    detectedThreeShotGroupCount: input.bracketGroups.filter(
      (group) => group.expectedCount === 3 && !isAmbiguousGroup(group)
    ).length,
    ambiguousPhotoCount: input.bracketGroups
      .filter(isAmbiguousGroup)
      .reduce((total, group) => total + group.detectedCount, 0)
  };
}
