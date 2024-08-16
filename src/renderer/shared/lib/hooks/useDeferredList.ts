import { useDeferredValue } from 'react';

type Params<T> = {
  list: T[];
  isLoading?: boolean;
};

export const useDeferredList = <T>({ list, isLoading }: Params<T>) => {
  const deferred = useDeferredValue(list);
  const isDeferred = deferred.length === 0 && list.length !== 0;

  return { isLoading: isLoading || isDeferred, list: deferred };
};
