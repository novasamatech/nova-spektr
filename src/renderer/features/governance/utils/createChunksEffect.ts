import { createEffect, createEvent, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

export const createChunksEffect = <T, V>(fn: (params: T, callback: (value: V) => unknown) => unknown) => {
  const request = createEvent<T>();
  const receive = createEvent<V>();

  const requestFx = createEffect((params: T) => {
    const boundedReceive = scopeBind(receive, { safe: true });

    return fn(params, boundedReceive);
  });

  sample({
    source: request,
    target: requestFx,
  });

  return {
    request,
    pending: requestFx.pending,
    done: requestFx.done,
    receive: readonly(receive),
  };
};
