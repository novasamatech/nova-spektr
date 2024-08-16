import { useMemo, useRef } from 'react';

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
