import { useState, useCallback } from 'react';

function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((value) => !value);
  }, []);

  return [value, toggle];
}

export default useToggle;
