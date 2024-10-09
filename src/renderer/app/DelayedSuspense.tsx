import { type ComponentType, lazy, useEffect } from 'react';

export const controlledLazy = (fn: () => Promise<ComponentType>) => {
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

export const suspenseDelayAdapter = (ttl: number) => {
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

export const LoadingDelay = ({ suspense }: { suspense: ReturnType<typeof suspenseDelayAdapter> | null }) => {
  return suspense ? suspense.wait() : null;
};
