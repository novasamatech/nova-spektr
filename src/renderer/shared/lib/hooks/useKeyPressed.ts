import { useEffect, useState } from 'react';

type Key = string;

/**
 * Returns true if the specified key is currently being pressed, false otherwise.
 *
 * @param {Key} targetKey - the key to check if it is being pressed
 * @param {boolean} withMetaKey - (optional) whether to consider the meta key (e.g. Ctrl or Command) in the check
 * @return {boolean} true if the key is being pressed, false otherwise
 */
export const useKeyPressed = (targetKey: Key, withMetaKey?: boolean): boolean => {
  const [keyPressed, setKeyPressed] = useState<boolean>(false);

  const downHandler = ({ key, metaKey, ctrlKey }: KeyboardEvent) => {
    const isMetaPressed = withMetaKey ? metaKey || ctrlKey : true;

    if (isMetaPressed && key === targetKey) {
      setKeyPressed(true);
    }
  };

  const upHandler = ({ key }: KeyboardEvent) => {
    if (key === targetKey) setKeyPressed(false);
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
