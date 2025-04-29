import { type PropsWithChildren, type ReactNode, useEffect, useState } from 'react';

type AsyncItemProps = PropsWithChildren<{
  sync?: boolean;
  delay?: number;
  fallback?: ReactNode;
}>;

/**
 * Renders children asynchronously using requestIdleCallback with setTimeout as
 * a fallback
 */
export const AsyncItem = ({ children, sync = false, delay, fallback }: AsyncItemProps) => {
  const [isRendered, setIsRendered] = useState(sync);

  useEffect(() => {
    if (sync) return;

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
  }, [children, sync]);

  if (isRendered) return children;

  return fallback ?? null;
};
