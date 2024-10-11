import { type ComponentType, lazy, useEffect } from 'react';

/**
 * React.lazy wrapper with additional onReady callback. Only components with no
 * props supported.
 */
export const controlledLazy = (fn: () => Promise<ComponentType<object>>) => {
  return lazy(async () => {
    const Component = await fn();
    const Wrapper = ({ onReady }: { onReady: VoidFunction }) => {
      useEffect(() => {
        onReady();
      }, []);

      return <Component />;
    };

    return { default: Wrapper };
  });
};

/**
 * This helper creates delay and throw promise until it resolves for
 * `React.Suspense`.
 */
export const suspenseDelay = (ttl: number) => {
  let resolved = false;
  let promise: Promise<unknown> | null = null;

  return {
    wait() {
      if (resolved) {
        return null;
      }

      if (!promise) {
        promise = new Promise((resolve) => setTimeout(resolve, ttl));
        promise.then(() => {
          resolved = true;
        });
      }

      throw promise;
    },
  };
};

/**
 * Adapter between `suspenseDelay` and `React.Suspense`
 */
export const LoadingDelay = ({ suspense }: { suspense: ReturnType<typeof suspenseDelay> | null }) => {
  return suspense ? suspense.wait() : null;
};
