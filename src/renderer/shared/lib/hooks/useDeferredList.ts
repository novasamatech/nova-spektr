import { useDeferredValue, useEffect, useState } from 'react';

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
 * @returns {boolean} Field list - deferred data for rendering.
 * @returns {boolean} Field isLoading - isLoading parameter + delay, introduced
 *   by deferred rendering.
 */
export const useDeferredList = <T>({ list, isLoading, forceFirstRender }: Params<T>) => {
  const [firstRender, setFirstRender] = useState(true);
  const deferred = useDeferredValue(list);
  const shouldForceRender = firstRender && !!forceFirstRender;
  const isDeferred = deferred.length === 0 && list.length !== 0;

  useEffect(() => {
    if (deferred.length > 0) {
      setFirstRender(false);
    }
  }, [deferred]);

  return { isLoading: isLoading || (!shouldForceRender && isDeferred), list: shouldForceRender ? list : deferred };
};
