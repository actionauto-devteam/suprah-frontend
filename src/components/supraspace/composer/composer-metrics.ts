export function createComposerMetrics() {
  let count = 0;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => count,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    update(text: string) {
      if (count === text.length) return;
      count = text.length;
      listeners.forEach(listener => listener());
    },
  };
}

export type ComposerMetrics = ReturnType<typeof createComposerMetrics>;
