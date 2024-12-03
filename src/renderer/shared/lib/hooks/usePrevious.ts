import { useEffect, useRef } from 'react';

/**
 * Store previous value
 *
 * @param value Arbitrary value
 */
export function usePrevious<T>(value: T): T {
  const ref = useRef<T>(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current as T;
}
