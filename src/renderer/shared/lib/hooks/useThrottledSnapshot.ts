import { useEffect, useRef, useState } from 'react';

/**
 * Captures the first non-null value immediately, then throttles subsequent
 * updates. Useful for subscription-based hooks where you need the initial value
 * fast but don't want frequent re-renders from live updates.
 */
export function useThrottledSnapshot<T>(value: T | null, interval: number): T | null {
  const [result, setResult] = useState<T | null>(null);
  const hasValueRef = useRef(false);
  const lastSetRef = useRef(0);

  useEffect(() => {
    if (value === null) return;

    const now = Date.now();

    if (!hasValueRef.current || now - lastSetRef.current >= interval) {
      hasValueRef.current = true;
      lastSetRef.current = now;
      setResult(value);
    } else {
      const remaining = interval - (now - lastSetRef.current);
      const id = setTimeout(() => {
        lastSetRef.current = Date.now();
        setResult(value);
      }, remaining);

      return () => clearTimeout(id);
    }
  }, [value, interval]);

  return result;
}
