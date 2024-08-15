import { createEffect, createEvent, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

export const createChunksEffect = <T, V>(fn: (params: T, callback: (value: V) => unknown) => unknown) => {
  const request = createEvent<T>();
  const receive = createEvent<{ params: T; result: V }>();

  const requestFx = createEffect((params: T) => {
    const boundedReceive = scopeBind(receive, { safe: true });
    const cb = (result: V) => boundedReceive({ params, result });

    return fn(params, cb);
  });

  sample({
    source: request,
    target: requestFx,
  });

  return {
    request,
    done: requestFx.done,
    receive: readonly(receive),
    $pending: requestFx.pending,
  };
};
