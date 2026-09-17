/** One owner per resource. Superseded or signed-out requests cannot commit data or end a newer loader. */
export function createTrackerRequestOwner() {
  let current: AbortController | null = null;
  return {
    reset() { current?.abort(); current = null; },
    begin() {
      current?.abort();
      const controller = new AbortController();
      current = controller;
      return {
        signal: controller.signal,
        isCurrent: () => current === controller && !controller.signal.aborted,
        finish() { if (current === controller) current = null; },
      };
    },
  };
}

/** Missing/malformed data is a failed refresh, never evidence that a collection is empty. */
export function requireTrackerArray<T = unknown>(value: unknown, collection: string): T[] {
  if (!Array.isArray(value)) throw new Error(`Could not read ${collection}. Please retry.`);
  return value as T[];
}