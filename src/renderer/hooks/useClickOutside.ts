import { useEffect, RefObject } from 'react';

function useClickOutside(refs: RefObject<HTMLElement>[], callback: () => void) {
  useEffect(() => {
    const listener = (event: Event) => {
      for (let ref of refs) {
        if (!ref.current || ref.current.contains(event.target as Node)) return;
      }

      callback();
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
