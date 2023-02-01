import { useEffect, useState } from 'react';

/**
 * The debounced value will only reflect the latest value
 * @param value arbitrary value
 * @param delay time to pause before action
 * @return {Any}
 */
function useDebounce<T>(value: T, delay = 300): T {
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

export default useDebounce;
