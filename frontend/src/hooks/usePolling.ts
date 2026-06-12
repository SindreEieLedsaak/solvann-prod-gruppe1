import { useEffect, useRef, useState } from 'react';

export interface PollingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Calls `fetchFn` immediately and then every `intervalMs` milliseconds.
 * The fetch function reference is stable — updates are reflected without
 * restarting the interval.
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs = 5000
): PollingState<T> {
  const [state, setState] = useState<PollingState<T>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fnRef = useRef(fetchFn);
  fnRef.current = fetchFn;

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const data = await fnRef.current();
        if (mounted) setState({ data, loading: false, error: null, lastUpdated: new Date() });
      } catch (err) {
        if (mounted)
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }));
      }
    };

    run();
    const id = setInterval(run, intervalMs);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return state;
}
