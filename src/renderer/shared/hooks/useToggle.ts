import { useState, useCallback } from 'react';

/**
 * Toggles initial value to opposite
 * @param initialValue value to toggle
 * @return {Array}
 */
function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((value) => !value);
  }, []);

  return [value, toggle];
}

export default useToggle;
