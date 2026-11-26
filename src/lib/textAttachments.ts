const SHRINK_OVER_BYTES = 900 * 1024;
const MAX_SIDE = 1600;
const QUALITIES = [0.82, 0.7, 0.6];

function jpgName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.jpg`;
}

export async function prepareTextFile(file: File): Promise<File> {
  if (!/^image\/(jpeg|png)$/i.test(file.type) || file.size <= SHRINK_OVER_BYTES) return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    for (const quality of QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= SHRINK_OVER_BYTES) {
        return new File([blob], jpgName(file.name), { type: "image/jpeg", lastModified: Date.now() });
      }
    }
    return file;
  } catch {
    return file;
  }
}

export async function prepareTextFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => prepareTextFile(file)));
}
