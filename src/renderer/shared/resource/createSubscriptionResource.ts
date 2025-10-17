import { type Event, type EventCallable, type Scope, type Store, createDomain, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';

import { type Resource } from './deriveFromResources';

type CallbackFn<V> = (value: IteratorResult<V, V | void>) => unknown;
type UnsubscribeFn = (() => void) | Promise<() => void>;
type SubscribeFn<P, V> = (params: P, callback: CallbackFn<V>) => UnsubscribeFn;

export interface SubscriptionResource<Params, Data> extends Resource<Data, Data, Params> {
  subscribed: Store<boolean>;
  subscribe: EventCallable<Params>;
  unsubscribe: EventCallable<void>;
  pending: Store<boolean>;
  receive: Event<{ params: Params; result: Data }>;
  fulfilled: Store<boolean>;
}

type SubscriptionParams<Params, Data> = {
  name?: string;
  pool?: (params: Params) => string;
  fn: SubscribeFn<Params, Data>;
  // For testing purposes
  scope?: Scope;
};

export const createSubscriptionResource = <Params, Data>({
  name = 'unknown',
  pool = () => Math.random().toString(),
  fn,
  scope,
}: SubscriptionParams<Params, Data>): SubscriptionResource<Params, Data> => {
  const domain = createDomain({ name: `${name}/subscription` });

  const pull = domain.createEvent<{ meta: never; result: Data }>();
  const push = domain.createEvent<{ meta: Params; result: Data }>();

  const subscribe = domain.createEvent<Params>({ name: 'subscribe' });
  const unsubscribe = domain.createEvent({ name: 'unsubscribe' });
  const callback = domain.createEvent<{ params: Params; result: Data }>({ name: 'callback' });
  const done = domain.createEvent({ name: 'done' });

  const $pending = domain.createStore(false, { name: 'pending' });
  const $fulfilled = domain.createStore(false, { name: 'fulfilled' });
  const $currentKey = domain.createStore('', { name: 'currentKey' });
  const $currentSubscription = domain.createStore<{ unsubscribe: UnsubscribeFn } | null>(null);
  const $subscribed = $currentSubscription.map(nonNullable);

  const subscribeFx = domain.createEffect<Params, UnsubscribeFn>((params) => {
    const boundReceived = scope ? scopeBind(callback, { scope }) : callback;
    const boundDone = scope ? scopeBind(done, { scope }) : done;

    return fn(params, (result) => {
      if (result.done) {
        if (nonNullable(result.value)) {
          boundReceived({ params, result: result.value });
        }
        boundDone();
      } else {
        boundReceived({ params, result: result.value });
      }
    });
  });

  const unsubscribeFx = domain.createEffect(({ fn }: { fn: UnsubscribeFn | null; resubscribe: Params | null }) => {
    if (fn) {
      if (fn instanceof Promise) {
        return fn.then((x) => x());
      } else {
        return fn();
      }
    }
  });

  // redirecting data
  sample({
    clock: pull,
    target: push,
  });

  // subscribe, if stale
  sample({
    clock: subscribe,
    source: { sub: $currentSubscription, key: $currentKey },
    filter({ sub, key }, params) {
      return nullable(sub) && key !== pool(params);
    },
    fn: (_, params) => params,
    target: subscribeFx,
  });

  // unsubscribe and pass param down for resubscription later
  sample({
    clock: subscribe,
    source: { sub: $currentSubscription, key: $currentKey },
    filter: ({ sub, key }, params) => nonNullable(sub) && key !== pool(params),
    fn: ({ sub }, resubscribe) => ({ fn: sub?.unsubscribe ?? null, resubscribe }),
    target: unsubscribeFx,
  });

  sample({
    clock: subscribe,
    fn: (params) => pool(params),
    target: $currentKey,
  });

  // save unsubscribe fn
  sample({
    clock: subscribeFx.done,
    fn: ({ params, result: unsubscribe }) => ({ key: pool(params), unsubscribe }),
    target: $currentSubscription,
  });

  // simple unsubscribe
  sample({
    clock: unsubscribe,
    source: $currentSubscription,
    fn: (sub) => ({ fn: sub?.unsubscribe ?? null, resubscribe: null }),
    target: unsubscribeFx,
  });

  sample({
    clock: unsubscribe,
    fn: () => '',
    target: $currentKey,
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

  // push

  sample({
    clock: callback,
    fn: ({ params, result }) => ({ meta: params, result }),
    target: push,
  });

  // status

  sample({
    clock: [subscribeFx, callback],
    fn: () => true,
    target: $pending,
  });

  sample({
    clock: [done, unsubscribeFx],
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
    pull,
    push: readonly(push),

    receive: callback,
    subscribed: readonly($subscribed),
    subscribe,
    unsubscribe,
    pending: readonly($pending),
    fulfilled: readonly($fulfilled),
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
