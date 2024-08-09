import { type RefObject, useCallback, useRef } from 'react';

/**
 * Scrolls to Ref element
 *
 * @param delay Time of delay
 *
 * @returns {Ref, Function}
 */
export function useScrollTo<T extends HTMLElement>(delay = 0): [RefObject<T>, () => void] {
  const ref = useRef<T>(null);

  const scroll = useCallback(() => {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), delay);
  }, [delay]);

  return [ref, scroll];
}
