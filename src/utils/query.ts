const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/**
 * Wraps a queryFn with a debounce using TanStack Query's AbortSignal.
 * When the query key changes before the delay elapses, TanStack cancels the
 * previous query and ignores its result automatically.
 */
export function debounced<T>(fn: () => Promise<T>, delay = 500) {
  return async ({ signal }: { signal: AbortSignal }): Promise<T> => {
    await sleep(delay, signal);
    return fn();
  };
}
