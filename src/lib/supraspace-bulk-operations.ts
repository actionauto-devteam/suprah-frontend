export async function runSupraSpaceBulkOperation<T>(
  items: T[],
  operation: (item: T) => Promise<void> | void,
  concurrency = 3,
): Promise<{ succeeded: T[]; failed: T[] }> {
  const succeeded: T[] = [];
  const failed: T[] = [];
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      try {
        await operation(item);
        succeeded.push(item);
      } catch {
        failed.push(item);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return { succeeded, failed };
}
