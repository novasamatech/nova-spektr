import type * as CSS from 'csstype';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { Box } from '../Box/Box';

type AsyncItemProps = PropsWithChildren<{
  delay?: number;
  onRender?: () => void;
  spaceToReserve?: {
    width?: CSS.Property.Width | number;
    height?: CSS.Property.Height | number;
  };
}>;

/**
 * Renders children asynchronously using requestIdleCallback with setTimeout as
 * a fallback
 */
export const AsyncItem = ({ children, delay, spaceToReserve }: AsyncItemProps) => {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let idleCallbackId: number;

    if (!window.requestIdleCallback || delay) {
      timeoutId = setTimeout(() => setIsRendered(true), delay || 1);
    } else {
      idleCallbackId = window.requestIdleCallback(() => setIsRendered(true));
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (idleCallbackId && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [children]);

  if (!isRendered) {
    if (spaceToReserve) {
      return <Box width={spaceToReserve.width} height={spaceToReserve.height}></Box>;
    } else {
      return null;
    }
  }

  return children;
};
