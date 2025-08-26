import { type PropsWithChildren, type ReactNode, useEffect, useState } from 'react';

type AsyncItemProps = PropsWithChildren<{
  strategy?: 'async' | 'idle' | 'sync';
  fallback?: ReactNode;
}>;

/**
 * Renders children asynchronously using requestIdleCallback with setTimeout as
 * a fallback
 */
export const AsyncItem = ({ children, strategy = 'async', fallback }: AsyncItemProps) => {
  const isSync = strategy === 'sync';
  const isAsync = strategy === 'async';

  const [isRendered, setIsRendered] = useState(isSync);
  const renderCallback = () => setIsRendered(true);

  useEffect(() => {
    if (isRendered) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let idleCallbackId: number;
    let animationFrameId: number;

    if (isAsync) {
      animationFrameId = requestAnimationFrame(renderCallback);
    } else if (!window.requestIdleCallback) {
      // fallback for idle callback
      timeoutId = setTimeout(renderCallback, 1);
    } else {
      idleCallbackId = window.requestIdleCallback(renderCallback);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (idleCallbackId && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleCallbackId);
      }
      animationFrameId && cancelAnimationFrame(animationFrameId);
    };
  }, [children, strategy]);

  if (isRendered) return children;

  return fallback ?? null;
};
