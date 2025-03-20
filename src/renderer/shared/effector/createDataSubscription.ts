import { type Scope, type StoreWritable, createDomain, is, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';

type CallbackFn<V> = (value: IteratorResult<V, V | void>) => unknown;
type UnsubscribeFn = (() => void) | Promise<() => void>;
type SubscribeFn<P, V> = (params: P, callback: CallbackFn<V>) => UnsubscribeFn;

type SubscriptionParams<Value, Params, Response> = {
  key?: (params: Params) => string;
  initial: Value | StoreWritable<Value>;
  fn: SubscribeFn<Params, Response>;
  map: (store: Value, result: { params: Params; result: Response }) => Value;

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
export const createDataSubscription = <Value, Params = void, Response = void>({
  key = () => Math.random().toString(),
  initial,
  fn,
  map,
  scope,
}: SubscriptionParams<Value, Params, Response>) => {
  const domain = createDomain({ name: 'data subscription' });

  const subscribe = domain.createEvent<Params>({ name: 'subscribe' });
  const unsubscribe = domain.createEvent({ name: 'unsubscribe' });
  const received = domain.createEvent<{ params: Params; result: Response }>({ name: 'received' });
  const done = domain.createEvent({ name: 'done' });

  const $store = is.store(initial) ? initial : domain.createStore<Value>(initial);
  const $pending = domain.createStore(false, { name: 'pending' });
  const $fulfilled = domain.createStore(false, { name: 'fulfilled' });
  const $currentSubscription = domain.createStore<{ unsubscribe: UnsubscribeFn; key: string } | null>(null);
  const $subscribed = $currentSubscription.map(nonNullable);

  const subscribeFx = domain.createEffect<Params, UnsubscribeFn>(params => {
    const bindedReceived = scope ? scopeBind(received, { scope }) : received;
    const bindedDone = scope ? scopeBind(done, { scope }) : done;

    return fn(params, result => {
      if (result.done) {
        if (result.value !== undefined) {
          bindedReceived({ params, result: result.value });
        }
        bindedDone();
      } else {
        bindedReceived({ params, result: result.value });
      }
    });
  });

  const unsubscribeFx = domain.createEffect(({ fn }: { fn: UnsubscribeFn | null; resubscribe: Params | null }) => {
    if (fn) {
      if (fn instanceof Promise) {
        return fn.then(x => x());
      } else {
        return fn();
      }
    }
  });

  // subscribe, if stale
  sample({
    clock: subscribe,
    source: $currentSubscription,
    filter: nullable,
    // TODO check params with shallow equal fn
    fn: (_, params) => params,
    target: subscribeFx,
  });

  // unsubscribe and pass param down for resubscription later
  sample({
    clock: subscribe,
    source: $currentSubscription,
    filter: (sub, params) => nonNullable(sub) && sub.key !== key(params),
    fn: (sub, resubscribe) => ({ fn: sub?.unsubscribe ?? null, resubscribe }),
    target: unsubscribeFx,
  });

  // save unsubscribe fn
  sample({
    clock: subscribeFx.done,
    fn: ({ params, result: unsubscribe }) => ({ key: key(params), unsubscribe }),
    target: $currentSubscription,
  });

  // simple unsubscribe
  sample({
    clock: unsubscribe,
    source: $currentSubscription,
    fn: sub => ({ fn: sub?.unsubscribe ?? null, resubscribe: null }),
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
    target: $currentSubscription,
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
    clock: [subscribe, received],
    fn: () => true,
    target: $pending,
  });

  sample({
    clock: [done, unsubscribe],
    fn: () => false,
    target: $pending,
  });

  sample({
    clock: done,
    fn: () => true,
    target: $fulfilled,
  });

  sample({
    clock: unsubscribe,
    fn: () => false,
    target: $fulfilled,
  });

  return {
    $: $store,

    subscribed: $subscribed,
    subscribe,
    unsubscribe,
    pending: $pending,
    fulfilled: $fulfilled,
    received: readonly(received),
  };
};

type PageHandlerParams<Input, Output> = {
  fn: () => AsyncGenerator<Input, void>;
  map: (input: Input) => Output | Promise<Output>;
};

export const createPagesHandler = <Input, Output>({ fn, map }: PageHandlerParams<Input, Output>) => {
  return async (abort: AbortController, callback: CallbackFn<Output>) => {
    for await (const record of fn()) {
      if (abort.signal.aborted) {
        break;
      }
      const value = await map(record);
      callback({ done: false, value });
    }

    callback({ done: true, value: undefined });
  };
};
