import { useMemo, useRef } from 'react';

/**
 * Saves value outside of React rendering cycle and returns getter function.
 * Similar to useRef + `ref.current = value` with simpler api.
 *
 * @param value - Value to save, will rewrite older value on each rerender.
 * @param fn - Optional mapping function.
 */
export const useLooseRef = <V, R = V>(value: V, fn?: (v: V) => R): (() => R) => {
  const ref = useRef<V>(value);
  const fnRef = useRef<typeof fn>(fn);
  ref.current = value;
  fnRef.current = fn;

  return useMemo(
    () => () => {
      const fn = fnRef.current;

      return fn ? fn(ref.current) : (ref.current as never as R);
    },
    [],
  );
};
