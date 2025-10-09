import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type KeyCombo = string[];

const mappedKeys: Record<string, string> = {
  shiftleft: 'shift',
  shiftright: 'shift',
  altleft: 'alt',
  altright: 'alt',
  metaleft: 'meta',
  metaright: 'meta',
  controlleft: 'ctrl',
  controlright: 'ctrl',
};

const normalizeKey = (key: string): string => {
  return mappedKeys[key] || key;
};

export const useKeyCombo = (keyCombo: KeyCombo): boolean => {
  const pressedKeys = useRef<Set<string>>(new Set());
  const [comboPressed, setComboPressed] = useState(false);
  const lowerKeyCombo = useMemo(() => keyCombo.map((k) => k.toLowerCase()), [keyCombo]);

  const matchCombo = useCallback(
    (pressedKeys: Set<string>): boolean => {
      if (pressedKeys.size !== lowerKeyCombo.length) {
        return false;
      }
      return lowerKeyCombo.every(
        (lowerKey) => pressedKeys.has(lowerKey) || Array.from(pressedKeys).some((p) => normalizeKey(p) === lowerKey),
      );
    },
    [lowerKeyCombo],
  );

  useEffect(() => {
    const downHandler = (event: KeyboardEvent) => {
      if (event.code === undefined) return;

      const key = event.code.toLowerCase();
      pressedKeys.current.add(key);
      setComboPressed(matchCombo(pressedKeys.current));
    };

    const upHandler = (event: KeyboardEvent) => {
      if (event.code === undefined) return;

      const key = event.code.toLowerCase();
      pressedKeys.current.delete(key);
      setComboPressed(matchCombo(pressedKeys.current));
    };

    const blurHandler = () => {
      pressedKeys.current.clear();
      setComboPressed(false);
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);
    window.addEventListener('blur', blurHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
      window.removeEventListener('blur', blurHandler);
      pressedKeys.current.clear();
    };
  }, [matchCombo]);

  return comboPressed;
};
