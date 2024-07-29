import { useCallback, useState } from 'react';

/**
 * Toggles initial value to opposite
 * @param initialValue value to toggle
 * @return {Array}
 */
export function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((value) => !value);
  }, []);

  return [value, toggle];
}
