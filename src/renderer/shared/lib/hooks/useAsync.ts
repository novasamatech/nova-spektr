import { type DependencyList, useEffect, useState } from 'react';

type UseAsyncOptions<T> = {
  asyncFn: () => Promise<T>;
  dependencies: DependencyList;
  skip?: boolean;
};

export const useAsync = <T>({ asyncFn, dependencies, skip = false }: UseAsyncOptions<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (skip) {
      setData(null);
      setPending(false);
      return;
    }

    let cancelled = false;
    setPending(true);

    asyncFn()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setPending(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setPending(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return { data, pending };
};
