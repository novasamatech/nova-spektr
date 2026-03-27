import { useRef } from 'react';

/**
 * Captures the first non-null value and freezes it for the component's
 * lifetime. Useful when a subscription-based hook (e.g. useBlock) provides live
 * updates but the consumer only needs the initial value.
 */
export function useSnapshot<T>(value: T | null): T | null {
  const ref = useRef<T | null>(null);

  if (value !== null && ref.current === null) {
    ref.current = value;
  }

  return ref.current;
}
