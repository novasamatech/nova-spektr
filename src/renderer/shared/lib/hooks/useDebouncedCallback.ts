import debounce from 'lodash/debounce';
import { useMemo } from 'react';

import { useLooseRef } from './useLooseRef';

export const useDebouncedCallback = <Args extends unknown[]>(ttl: number, callback: (...args: Args) => unknown) => {
  const cbRef = useLooseRef(callback);
  const debouncedCallback = useMemo(() => {
    return debounce((...args: Args) => cbRef()(...args), ttl);
  }, []);

  return debouncedCallback;
};
