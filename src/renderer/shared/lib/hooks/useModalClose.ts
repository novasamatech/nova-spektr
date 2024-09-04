import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_TRANSITION } from '@shared/lib/utils';

import { useLooseRef } from './useLooseRef';

/**
 * Modal open-flag with delayed callback
 *
 * @param initialValue Value to toggle
 * @param closeCallback Value to toggle
 * @param delay Value to toggle
 *
 * @returns {Array}
 */
export function useModalClose(
  initialValue: boolean,
  closeCallback: () => void,
  delay = DEFAULT_TRANSITION,
): [boolean, () => void] {
  const cb = useLooseRef(closeCallback);

  const [isOpen, setIsOpen] = useState(initialValue);

  useEffect(() => {
    if (isOpen === initialValue) return;

    setIsOpen(initialValue);
  }, [initialValue]);

  const closeModal = useCallback(() => {
    setIsOpen(false);

    setTimeout(() => cb()(), delay);
  }, [delay]);

  return [isOpen, closeModal];
}
