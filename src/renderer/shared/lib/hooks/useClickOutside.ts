import { type RefObject, useEffect } from 'react';

/**
 * Observe provided element(s) and call callback function
 * if clicked is registered outside of it (them)
 * @param refs DOM element to observe
 * @param callback function to be called on click
 */
export function useClickOutside(refs: RefObject<HTMLElement>[], callback: () => void): void {
  useEffect(() => {
    const listener = (event: Event) => {
      const refIsClicked = refs.every((ref) => {
        return ref.current && !ref.current.contains(event.target as Node);
      });

      if (refIsClicked) callback();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refs.length]);
}
