import { useDeferredValue } from 'react';

type Params<T> = {
  list: T[];
  isLoading?: boolean;
};

/**
 * Hook solves problem with intermediate state between loading finished and
 * deferred list rendering finished. This problem appears on large lists.
 *
 * @returns {boolean} Field list - deferred data for rendering.
 * @returns {boolean} Field isLoading - isLoading parameter + delay, introduced
 *   by deferred rendering.
 */
export const useDeferredList = <T>({ list, isLoading }: Params<T>) => {
  const deferred = useDeferredValue(list);
  const isDeferred = deferred.length === 0 && list.length !== 0;

  return { isLoading: isLoading || isDeferred, list: deferred };
};
