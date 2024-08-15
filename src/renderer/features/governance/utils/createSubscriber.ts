import { type Scope, createDomain, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

import { nonNullable, nullable } from '@shared/lib/utils';

type UnsubscribeFn = () => void;
type SubscribeFn<P, V> = (params: P, callback: (value: V) => void) => UnsubscribeFn;

/**
 * Set of subscribe utils for reactive update of external store.
 *
 * @example
 *   ```ts
 *   const { subscribe, receive, unsubscribe } = createSubscriber<Params, Data>((params, cb) => {
 *    const unsub = someEventEmitter.subscribe(params, (data) => {
 *     cb(data)
 *    });
 *
 *    return unsub;
 *   });
 *
 *   sample({
 *    clock: gate.open,
 *    target: subscribe,
 *   });
 *
 *   sample({
 *    clock: gate.close,
 *    target: unsubscribe,
 *   });
 *
 *   sample({
 *    clock: receive,
 *    target: $someStore,
 *   })
 *   ```;
 *
 * @param fn - Creates subscription. Should return unsubsribe function.
 *   function.
 * @param scope - Optional scope for testing
 */
export const createSubscriber = <P = void, V = void>(fn: SubscribeFn<P, V>, scope?: Scope) => {
  const domain = createDomain({ name: 'subscriber' });

  const subscribe = domain.createEvent<P>();
  const unsubscribe = domain.createEvent<P>();
  const received = domain.createEvent<{ params: P; result: V }>();

  const $unsubscribeFn = domain.createStore<UnsubscribeFn | null>(null);

  const subscribeFx = domain.createEffect<P, UnsubscribeFn>((params) => {
    const binded = scopeBind(received, { scope });

    return fn(params, (result) => {
      binded({ params, result });
    });
  });

  const unsubscribeFx = domain.createEffect(({ fn }: { fn: UnsubscribeFn | null; resubscribe: P | null }) => {
    if (fn) fn();
  });

  // subscribe, if stale
  sample({
    clock: subscribe,
    source: $unsubscribeFn,
    filter: nullable,
    fn: (_, params) => params,
    target: subscribeFx,
  });

  // unsubscribe and pass param down for resubscription later
  sample({
    clock: subscribe,
    source: $unsubscribeFn,
    filter: nonNullable,
    fn: (fn, resubscribe) => ({
      fn,
      resubscribe,
    }),
    target: unsubscribeFx,
  });

  // save unsubscribe fn
  sample({
    clock: subscribeFx.doneData,
    target: $unsubscribeFn,
  });

  // simple unsubscribe
  sample({
    clock: unsubscribe,
    source: $unsubscribeFn,
    fn: (subscribeFn) => ({
      fn: subscribeFn,
      resubscribe: null,
    }),
    target: unsubscribeFx,
  });

  // resubscribe, if has parameters for subscription
  sample({
    clock: unsubscribeFx.done,
    filter: ({ params }) => nonNullable(params.resubscribe),
    fn: ({ params }) => params.resubscribe!,
    target: subscribeFx,
  });

  // reset, if it's simple unsubscribe
  sample({
    clock: unsubscribeFx.done,
    filter: ({ params }) => nullable(params.resubscribe),
    fn: () => null,
    target: $unsubscribeFn,
  });

  return {
    $subscribed: $unsubscribeFn.map(nonNullable),
    subscribe,
    unsubscribe,
    received: readonly(received),
  };
};
