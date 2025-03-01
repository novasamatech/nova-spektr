import { createEffect } from 'effector';

import { createAsyncTaskPool } from '@/shared/lib/utils';

type Config = Partial<{
  retryCount: number;
  retryDelay: number;
}>;

export const createQueuedEffect = <P, R>(fn: (params: P) => R | Promise<R>, config?: Config) => {
  const queue = createAsyncTaskPool({
    poolSize: 1,
    retryCount: config?.retryCount ?? 0,
    retryDelay: config?.retryDelay ?? 0,
  });

  return createEffect<P, R>(params => {
    return queue.call(() => fn(params));
  });
};
