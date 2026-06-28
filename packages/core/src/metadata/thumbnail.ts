import sharp from "sharp";
import { getFileExtension } from "./extract";

export const jpegThumbnailMaxWidth = 360;
export const jpegThumbnailMaxHeight = 240;

export function isJpegUpload(filename: string): boolean {
  const extension = getFileExtension(filename);
  return extension === ".jpg" || extension === ".jpeg";
}

export async function generateJpegThumbnail(input: {
  filename: string;
  body: Buffer;
}): Promise<Buffer | null> {
  if (!isJpegUpload(input.filename)) {
    return null;
  }

  try {
    return await sharp(input.body, {
      failOn: "none"
    })
      .rotate()
      .resize({
        width: jpegThumbnailMaxWidth,
        height: jpegThumbnailMaxHeight,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({
        quality: 78,
        mozjpeg: true
      })
      .toBuffer();
  } catch {
    return null;
  }
}
