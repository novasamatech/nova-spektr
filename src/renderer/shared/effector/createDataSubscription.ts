import { type Scope, createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

import { nonNullable, nullable } from '@shared/lib/utils';

type CallbackFn<V> = (value: IteratorResult<V, void>) => unknown;
type UnsubscribeFn = (() => void) | Promise<() => void>;
type SubscribeFn<P, V> = (params: P, callback: CallbackFn<V>) => UnsubscribeFn;

type SubscriptionParams<Store, Params, Response> = {
  initial: Store;
  fn: SubscribeFn<Params, Response>;
  map: (store: Store, result: { params: Params; result: Response }) => Store;

  // For testing purposes
  scope?: Scope;
};

/**
 * Subscriber factory for reactive updates of external store.
 *
 * Callback function received `IteratorResult<V, void>`, which tells user if all
 * data received or not. It can be usefull for paged requests.
 *
 * @example
 *   ```ts
 *   const { subscribe, receive, unsubscribe } = createSubscriber<Params, Data>((params, cb) => {
 *    const unsub = someEventEmitter.subscribe(params, (value) => {
 *     cb({
 *      done: false,
 *      value
 *     })
 *
 *     // Later on
 *
 *     cb({
 *      done: true,
 *      value: undefined
 *     })
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
export const createDataSubscription = <Store, Params = void, Response = void>({
  initial,
  fn,
  map,
  scope,
}: SubscriptionParams<Store, Params, Response>) => {
  const subscribe = createEvent<Params>();
  const unsubscribe = createEvent();
  const received = createEvent<{ params: Params; result: Response }>();
  const done = createEvent();

  const $store = createStore<Store>(initial);
  const $pending = createStore(false);
  const $unsubscribeFn = createStore<UnsubscribeFn | null>(null);
  const $subscribed = $unsubscribeFn.map(nonNullable);

  const subscribeFx = createEffect<Params, UnsubscribeFn>((params) => {
    const bindedReceived = scopeBind(received, { scope });
    const bindedDone = scopeBind(done, { scope });

    return fn(params, (result) => {
      if (result.done) {
        bindedDone();
      } else {
        bindedReceived({ params, result: result.value });
      }
    });
  });

  const unsubscribeFx = createEffect(({ fn }: { fn: UnsubscribeFn | null; resubscribe: Params | null }) => {
    if (fn) {
      if (fn instanceof Promise) {
        return fn.then((x) => x());
      } else {
        return fn();
      }
    }
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
    fn: (fn, resubscribe) => ({ fn, resubscribe }),
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
    fn: (subscribeFn) => ({ fn: subscribeFn, resubscribe: null }),
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

  // store update

  sample({
    clock: received,
    source: $store,
    fn: map,
    target: $store,
  });

  // status

  sample({
    clock: received,
    fn: () => true,
    target: $pending,
  });

  sample({
    clock: [done, unsubscribe],
    fn: () => false,
    target: $pending,
  });

  return {
    $: $store,

    subscribed: $subscribed,
    subscribe,
    unsubscribe,
    pending: $pending,
    received: readonly(received),
  };
};

export const createPagesHandler = <Value>(fn: () => AsyncGenerator<Value, void>) => {
  return async (abort: AbortController, callback: CallbackFn<Value>) => {
    for await (const value of fn()) {
      if (abort.signal.aborted) {
        break;
      }
      callback({ done: false, value });
    }

    callback({ done: true, value: undefined });
  };
};
