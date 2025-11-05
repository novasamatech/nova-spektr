import { type Domain, createEffect } from 'effector';

import { createAsyncTaskPool } from '@/shared/lib/utils';

type Config<P> = Partial<{
  pool(params: P): string | undefined;
  retryCount: number;
  retryDelay: number;
  domain?: Domain;
}>;

/**
 * Effector's effect with queueing. Pass pool as second argument to split queues
 * by arguments.
 *
 * @example
 *   Simple effect with queue
 *   ```ts
 *   const fx = createQueuedEffect<Params, Result>((params) => { ... });
 *   ```
 *
 * @example
 *   Multiple queues. For each chain there is a separated request pool.
 *   ```ts
 *   const fx = createQueuedEffect(
 *   (params: { chainId: string }) => { ... },
 *   { pool: (params) => params.chainId }
 *   )
 *   ```
 */
export const createQueuedEffect = <Params = void, Result = void, Fail = Error>(
  fn: (params: Params) => Result | Promise<Result>,
  config?: Config<NoInfer<Params>>,
) => {
  const queue = createAsyncTaskPool({
    poolSize: 1,
    retryCount: config?.retryCount ?? 0,
    retryDelay: config?.retryDelay ?? 0,
  });

  const create = config?.domain?.createEffect ?? createEffect;

  return create<Params, Result, Fail>(params => {
    return queue.call(() => fn(params), { pool: config?.pool?.(params) });
  });
};
