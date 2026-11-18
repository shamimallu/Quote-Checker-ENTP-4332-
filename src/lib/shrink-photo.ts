// Browser-only. Phone photos are often 3–8MB and carry hidden details (like the GPS location
// where they were taken). Redrawing the photo as a new, smaller JPEG keeps only the picture:
// it fits under the upload limit and drops the hidden details.
const MAX_SIDE = 2000; // pixels; plenty to read small print

export async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file; // PDFs are sent as they are
  try {
    const bitmap = await createImageBitmap(file); // also turns sideways phone photos upright
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // This browser can't open the photo (for example HEIC outside Safari); send the original.
    return file;
  }
}
