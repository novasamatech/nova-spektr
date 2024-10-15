import { useEffect, useState } from 'react';

import { IS_MAC } from '@/shared/lib/utils';

/**
 * Returns a boolean indicating whether the alt key (for macOS) or control key
 * (for Windows and Linux) is currently pressed.
 *
 * @returns {boolean} A boolean indicating whether the alt key is currently
 *   pressed.
 */
export const useAltOrCtrlKeyPressed = (): boolean => {
  const [keyPressed, setKeyPressed] = useState<boolean>(false);

  const downHandler = ({ altKey, ctrlKey }: KeyboardEvent) => {
    if (IS_MAC ? altKey : ctrlKey) {
      setKeyPressed(true);
    }
  };

  const upHandler = ({ altKey, ctrlKey }: KeyboardEvent) => {
    if (IS_MAC ? !altKey : !ctrlKey) setKeyPressed(false);
  };

  useEffect(() => {
    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, []);

  return keyPressed;
};
