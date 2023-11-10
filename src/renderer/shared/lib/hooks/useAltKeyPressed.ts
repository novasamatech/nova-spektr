import { useEffect, useState } from 'react';

/**
 * Returns a boolean indicating whether the alt key is currently pressed.
 *
 * @return {boolean} A boolean indicating whether the alt key is currently pressed.
 */
export const useAltKeyPressed = (): boolean => {
  const [keyPressed, setKeyPressed] = useState<boolean>(false);

  const downHandler = ({ altKey }: KeyboardEvent) => {
    if (altKey) {
      setKeyPressed(true);
    }
  };

  const upHandler = ({ altKey }: KeyboardEvent) => {
    if (!altKey) setKeyPressed(false);
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
