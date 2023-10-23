import { useState, useCallback } from 'react';

import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';

/**
 * Modal open-flag with delayed callback
 * @param initialValue value to toggle
 * @param closeCallback value to toggle
 * @param delay value to toggle
 * @return {Array}
 */
export function useModalClose(
  initialValue: boolean,
  closeCallback: () => void,
  delay = DEFAULT_TRANSITION,
): [boolean, () => void] {
  const [isOpen, setIsOpen] = useState(initialValue);

  const closeModal = useCallback(() => {
    setIsOpen(false);

    setTimeout(closeCallback, delay);
  }, [closeCallback, delay]);

  return [isOpen, closeModal];
}
