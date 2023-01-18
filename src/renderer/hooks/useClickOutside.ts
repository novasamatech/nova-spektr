import { useEffect, RefObject } from 'react';

function useClickOutside(refs: RefObject<HTMLElement>[], callback: () => void): void {
  useEffect(() => {
    const listener = (event: Event) => {
      const refIsClicked = refs.some((ref) => {
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

export default useClickOutside;
