import { type PropsWithChildren, type ReactNode, useDeferredValue } from 'react';

type AsyncItemProps = PropsWithChildren<{
  strategy?: 'async' | 'idle' | 'sync';
  fallback?: ReactNode;
}>;

export const AsyncItem = ({ children, strategy = 'async', fallback }: AsyncItemProps) => {
  const isReady = useDeferredValue(true, strategy === 'sync');

  if (!isReady) return fallback ?? null;

  return children;
};
