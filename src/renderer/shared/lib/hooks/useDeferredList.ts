import { useDeferredValue } from 'react';

type Params<T> = {
  list: T[];
  isLoading?: boolean;
};

export const useDeferredList = <T>({ list, isLoading }: Params<T>) => {
  const deferred = useDeferredValue(list);
  const isDeferred = deferred.length === 0 && deferred !== list;

  return { isLoading: isLoading || isDeferred, list: deferred };
};
