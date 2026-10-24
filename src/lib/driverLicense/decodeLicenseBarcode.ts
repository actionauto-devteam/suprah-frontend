export const ZXING_WASM_PATH = "/vendor/zxing-wasm-3.1.5/zxing_reader.wasm";

type ReaderModule = typeof import("zxing-wasm/reader");

let readerPromise: Promise<ReaderModule> | null = null;

const loadReader = () => {
  if (!readerPromise) {
    readerPromise = import("zxing-wasm/reader")
      .then(async (reader) => {
        await reader.prepareZXingModule({
          overrides: {
            locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? ZXING_WASM_PATH : prefix + path),
          },
          fireImmediately: true,
        });
        return reader;
      })
      .catch((error) => {
        readerPromise = null;
        throw error;
      });
  }
  return readerPromise;
};

export const preloadLicenseDecoder = () => loadReader().then(() => undefined);

export async function decodeLicenseBarcode(image: ImageData): Promise<string | null> {
  const { readBarcodes } = await loadReader();
  const results = await readBarcodes(image, { formats: ["PDF417"], textMode: "Plain", tryHarder: true, maxNumberOfSymbols: 1 });
  const hit = results.find((result) => result.isValid && result.text);
  return hit ? hit.text : null;
}

const drawToImageData = (source: CanvasImageSource, width: number, height: number, maxEdge: number) => {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas_unavailable");
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  const data = context.getImageData(0, 0, targetWidth, targetHeight);
  context.clearRect(0, 0, targetWidth, targetHeight);
  canvas.width = 0;
  canvas.height = 0;
  return data;
};

export function imageDataFromVideo(video: HTMLVideoElement, maxEdge = 1920): ImageData | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  return drawToImageData(video, video.videoWidth, video.videoHeight, maxEdge);
}

export async function imageDataFromFile(file: Blob, maxEdges: number[] = [2400, 1400]): Promise<ImageData[]> {
  const bitmap = await createImageBitmap(file);
  try {
    return maxEdges.map((edge) => drawToImageData(bitmap, bitmap.width, bitmap.height, edge));
  } finally {
    bitmap.close();
  }
}
