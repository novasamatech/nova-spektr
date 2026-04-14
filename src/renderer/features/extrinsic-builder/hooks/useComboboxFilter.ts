import { useCallback, useMemo, useState } from 'react';

/**
 * Shared state logic for filterable Combobox components. Handles editing state,
 * filtering, and display value.
 */
export function useComboboxFilter(options: string[], value: string | null, onChange: (value: string) => void) {
  const [inputText, setInputText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!isEditing || !inputText) return options;
    const lower = inputText.toLowerCase();

    return options.filter((name) => name.toLowerCase().includes(lower));
  }, [options, inputText, isEditing]);

  const displayValue = isEditing ? inputText : (value ?? '');

  const handleChange = useCallback(
    (val: string) => {
      if (options.includes(val)) {
        onChange(val);
        setIsEditing(false);
        setInputText('');
      } else {
        setInputText(val);
      }
    },
    [options, onChange],
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setInputText('');
  }, []);

  const handleInput = useCallback((v: string) => {
    setIsEditing(true);
    setInputText(v);
  }, []);

  return { filteredOptions, displayValue, handleChange, handleBlur, handleInput };
}
