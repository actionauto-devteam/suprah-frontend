/**
 * A random id sent with a chat message or alert. The server uses it to spot a
 * retry of the same send (for example after a timeout) so it isn't delivered twice.
 */
export function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Keeps the same id while the same thing is being sent again (a retry after an
 * error), and makes a new one as soon as the content changes.
 */
export function createRetrySafeId() {
  let current: { key: string; id: string } | null = null;
  return {
    idFor(key: string): string {
      if (current?.key !== key) current = { key, id: newClientRequestId() };
      return current.id;
    },
    clear() {
      current = null;
    },
  };
}
