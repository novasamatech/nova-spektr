import { useEffect, useState } from 'react';

/**
 * The debounced value will only reflect the latest value
 *
 * @param value Arbitrary value
 * @param delay Time to pause before action
 *
 * @returns {Any}
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
