import { useEffect, useRef } from 'react';

/**
 * Store previous value
 *
 * @param value Arbitrary value
 *
 * @returns {Any}
 */
export function usePrevious<T>(value: T): T {
  const ref: any = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
