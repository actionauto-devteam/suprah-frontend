type RefreshOptions = {
  refresh: () => Promise<void>;
  getDelay: () => number;
  isVisible: () => boolean;
  coalesceMs?: number;
};

export function createNotificationRefreshController({ refresh, getDelay, isVisible, coalesceMs = 250 }: RefreshOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let poll: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let pending = false;
  let disposed = false;

  const clearTimers = () => {
    if (timer !== null) clearTimeout(timer);
    if (poll !== null) clearTimeout(poll);
    timer = poll = null;
  };
  const schedule = (delay: number) => {
    if (disposed || running || timer !== null || !isVisible()) return;
    timer = setTimeout(() => { void run(); }, delay);
  };
  const run = async () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (disposed || running || !isVisible()) return;
    if (poll !== null) clearTimeout(poll);
    poll = null;
    running = true;
    pending = false;
    try {
      await refresh().catch(() => undefined);
    } finally {
      running = false;
      if (!disposed && isVisible()) {
        if (pending) schedule(coalesceMs);
        else poll = setTimeout(() => { poll = null; void run(); }, getDelay());
      }
    }
  };

  return {
    request() {
      pending = true;
      schedule(coalesceMs);
    },
    resume() {
      pending = true;
      clearTimers();
      schedule(0);
    },
    pause: clearTimers,
    dispose() {
      disposed = true;
      clearTimers();
    },
  };
}

export function rememberNotificationId(seen: Set<string>, id: string): boolean {
  if (!id || seen.has(id)) return false;
  seen.add(id);
  if (seen.size > 1000) seen.delete(seen.values().next().value!);
  return true;
}
