import { type Scope, type UnitValue, createDomain, sample, scopeBind } from 'effector';
import { readonly, spread } from 'patronum';

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
  const received = domain.createEvent<V>();

  const $subscribeFn = domain.createStore<UnsubscribeFn | null>(null);

  const subscribeFx = domain.createEffect<{ params: P; subscribe: SubscribeFn<P, V> }, UnsubscribeFn>(
    ({ params, subscribe }) => {
      const binded = scopeBind(received, { scope });

      return subscribe(params, binded);
    },
  );

  const unsubscribeFx = domain.createEffect((fn: UnitValue<typeof $subscribeFn>) => {
    if (fn) {
      return fn();
    }
  });

  sample({
    clock: subscribe,
    source: $subscribeFn,
    filter: nullable,
    fn: (subscribeFn, params) => ({ subscribeFn, fx: { params, subscribe: fn } }),
    target: spread({ subscribeFn: $subscribeFn, fx: subscribeFx }),
  });

  sample({
    clock: subscribeFx.doneData,
    target: $subscribeFn,
  });

  sample({
    clock: unsubscribe,
    source: $subscribeFn,
    target: unsubscribeFx,
  });

  sample({
    clock: unsubscribeFx.done,
    fn: () => null,
    target: $subscribeFn,
  });

  return {
    $subscribed: $subscribeFn.map(nonNullable),
    subscribe,
    unsubscribe,
    received: readonly(received),
  };
};
