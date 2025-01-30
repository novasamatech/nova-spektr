import { createEffect } from 'effector';

type Params<P, R> = {
  fn(params: P, abort: AbortSignal): Awaited<R> | Promise<Awaited<R>>;
  key(params: P): string;
};

export const takeLast = <P, R>({ fn, key }: Params<P, R>) => {
  const controllers: Record<string, AbortController> = {};

  return createEffect(async (params: P) => {
    const effectKey = key(params);

    let controller = controllers[effectKey];
    if (controller) controller.abort();
    controller = new AbortController();
    controllers[effectKey] = controller;

    try {
      return await fn(params, controller.signal);
    } finally {
      if (controllers[effectKey] === controller) {
        delete controllers[effectKey];
      }
      controller.signal.throwIfAborted();
    }
  });
};
