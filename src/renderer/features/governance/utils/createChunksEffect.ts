import { createDomain, sample } from 'effector';
import { readonly } from 'patronum';

export const createChunksEffect = <T, V>(fn: (params: T, callback: (value: V) => unknown) => unknown) => {
  const domain = createDomain();

  const request = domain.createEvent<T>();
  const received = domain.createEvent<{ params: T; result: V }>();

  const requestFx = domain.createEffect((params: T) => {
    return fn(params, (result: V) => {
      received({ params, result });
    });
  });

  sample({
    source: request,
    target: requestFx,
  });

  return {
    request,
    done: requestFx.done,
    received: readonly(received),
    $pending: requestFx.pending,
  };
};
