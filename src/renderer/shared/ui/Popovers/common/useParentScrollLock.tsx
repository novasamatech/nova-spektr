import { useEffect } from 'react';

import { popoverUtils } from './utils';

export const useParentScrollLock = (shouldLockScroll: boolean, element?: HTMLElement | null) => {
  useEffect(() => {
    if (element) {
      const scrollableParent = popoverUtils.findScrollContainer(element);

      if (shouldLockScroll) {
        scrollableParent?.addEventListener('wheel', popoverUtils.blockScroll);
        scrollableParent?.addEventListener('touchmove', popoverUtils.blockScroll);
      } else {
        scrollableParent?.removeEventListener('wheel', popoverUtils.blockScroll);
        scrollableParent?.removeEventListener('touchmove', popoverUtils.blockScroll);
      }

      return () => {
        scrollableParent?.removeEventListener('wheel', popoverUtils.blockScroll);
        scrollableParent?.removeEventListener('touchmove', popoverUtils.blockScroll);
      };
    }
  }, [shouldLockScroll, element]);
};
