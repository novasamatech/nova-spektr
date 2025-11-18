import { useDeferredValue } from 'react';

type Params<T> = {
  list: T[];
  isLoading?: boolean;
  /**
   * Render list directly until first deferred value is resolved.
   */
  forceFirstRender?: boolean;
};

/**
 * Hook solves problem with intermediate state between loading finished and
 * deferred list rendering finished. This problem appears on large lists.
 *
 * @returns {Object} List - deferred data for rendering.
 * @returns {Object} IsLoading - isLoading parameter + delay, introduced by
 *   deferred rendering.
 */
export const useDeferredList = <T>({ list, isLoading, forceFirstRender }: Params<T>) => {
  const deferred = useDeferredValue(list, forceFirstRender ? list : []);
  const isStale = deferred.length === 0 && list.length !== 0;

  return {
    isLoading: isLoading || isStale,
    list: deferred,
  };
};
