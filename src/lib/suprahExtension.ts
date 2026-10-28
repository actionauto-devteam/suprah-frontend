const DEFAULT_EXTENSION_IDS = ["fjpfmocfeidcflangiebhbmdkfmbloek"];
const EXTENSION_ID = /^[a-p]{32}$/;

interface ExtensionRuntime {
  sendMessage: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void;
  lastError?: { message?: string };
}

export function suprahExtensionIds(): string[] {
  const configured = String(process.env.NEXT_PUBLIC_SUPRAH_EXTENSION_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => EXTENSION_ID.test(id));
  return configured.length ? configured : DEFAULT_EXTENSION_IDS;
}

function extensionRuntime(): ExtensionRuntime | null {
  if (typeof window === "undefined") return null;
  const runtime = (window as unknown as { chrome?: { runtime?: ExtensionRuntime } }).chrome?.runtime;
  return runtime && typeof runtime.sendMessage === "function" ? runtime : null;
}

export function sendToExtension<T>(extensionId: string, message: unknown, timeoutMs = 2000): Promise<T | null> {
  const runtime = extensionRuntime();
  if (!runtime) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    try {
      runtime.sendMessage(extensionId, message, (response) => {
        window.clearTimeout(timer);
        if (runtime.lastError) {
          finish(null);
          return;
        }
        finish((response as T) ?? null);
      });
    } catch {
      window.clearTimeout(timer);
      finish(null);
    }
  });
}
