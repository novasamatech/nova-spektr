import { useCallback, useState } from 'react';

/**
 * Toggles initial value to opposite
 *
 * @param initialValue Value to toggle
 *
 * @returns {Array}
 */
export function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((value) => !value);
  }, []);

  return [value, toggle];
}
