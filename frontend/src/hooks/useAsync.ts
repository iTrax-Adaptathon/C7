import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { ApiError } from '../api';

export interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  return new ApiError(0, err instanceof Error ? err.message : 'Something went wrong.');
}

/**
 * Runs `load` on mount and whenever `deps` change; `reload()` re-runs it.
 * Results from a superseded run are discarded so a slow response can't
 * overwrite a newer one.
 */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    setLoading(true);
    setError(null);
    load().then(
      (result) => {
        if (runId.current !== id) return;
        setData(result);
        setLoading(false);
      },
      (err) => {
        if (runId.current !== id) return;
        setError(toApiError(err));
        setLoading(false);
      },
    );
    return () => {
      // invalidate this run if deps change or the component unmounts
      if (runId.current === id) runId.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, error, loading, reload };
}
