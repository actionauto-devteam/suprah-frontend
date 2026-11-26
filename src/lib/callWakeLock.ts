export type ScreenLock = {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
};

export type ScreenLockApi = {
  request: (type: "screen") => Promise<ScreenLock>;
};

export type CallPage = {
  visibilityState: string;
  addEventListener: (type: "visibilitychange", listener: () => void) => void;
  removeEventListener: (type: "visibilitychange", listener: () => void) => void;
};

export function keepScreenOnDuringCall(
  api: ScreenLockApi | undefined,
  page: CallPage,
  onChange?: (screenOn: boolean) => void,
): () => void {
  if (!api) {
    onChange?.(false);
    return () => undefined;
  }

  let lock: ScreenLock | null = null;
  let stopped = false;
  let requesting = false;

  const hold = (next: ScreenLock | null) => {
    lock = next;
    onChange?.(Boolean(next));
  };

  const acquire = async () => {
    if (stopped || lock || requesting || page.visibilityState !== "visible") return;
    requesting = true;
    try {
      const next = await api.request("screen");
      if (stopped) {
        await next.release().catch(() => undefined);
        return;
      }
      next.addEventListener?.("release", () => {
        if (lock === next) hold(null);
      });
      hold(next);
    } catch {
      hold(null);
    } finally {
      requesting = false;
    }
  };

  const onVisibility = () => {
    if (page.visibilityState === "visible") void acquire();
  };

  page.addEventListener("visibilitychange", onVisibility);
  void acquire();

  return () => {
    stopped = true;
    page.removeEventListener("visibilitychange", onVisibility);
    const held = lock;
    lock = null;
    if (held) void held.release().catch(() => undefined);
  };
}
