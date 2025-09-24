import { createEffect } from 'effector';

type Params<P, R> = {
  fn(params: P, abort: AbortSignal): R | Promise<R>;
  key(params: P): string;
};

/**
 * Creates an Effector effect that implements the "take last" pattern by
 * automatically canceling previous operations when a new one starts with the
 * same key.
 *
 * This is useful for preventing race conditions and ensuring only the most
 * recent operation completes, particularly in scenarios like search
 * autocomplete, API requests, or resource loading where you want to discard
 * outdated results.
 *
 * @example
 *   ```typescript
 *   const searchEffect = takeLast({
 *   fn: async (query: string, abort: AbortSignal) => {
 *   const response = await fetch(`/api/search?q=${query}`, { signal: abort });
 *   return response.json();
 *   },
 *   key: (query: string) => query
 *   });
 *
 *   // If called rapidly, only the last call will complete
 *   searchEffect("hello"); // Will be aborted
 *   searchEffect("world"); // Will complete
 *   ```
 *
 * @template P - The type of parameters passed to the effect
 * @template R - The type of the result returned by the effect
 *
 * @param params - Configuration object for the takeLast effect
 * @param params.fn - The async function to execute. Receives the parameters and
 *   an AbortSignal that should be used to handle cancellation gracefully
 * @param params.key - Function that generates a string key from the parameters.
 *   Operations with the same key will cancel each other
 *
 * @returns An Effector effect that cancels previous operations with the same
 *   key
 */
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
