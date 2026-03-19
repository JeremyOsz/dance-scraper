export async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]!);
    }
  }

  await Promise.all(Array.from({ length: limit }, runWorker));
}
