import { type EventCallable, type Store, createEffect, createStore, sample, scopeBind } from 'effector';

import { type ResourceRequestKey } from '@/shared/query';

/** The pooled, ref-counted half of a `shared/query` subscription resource. */
type PooledResource<Params> = {
  subscribe: EventCallable<Params>;
  unsubscribe: EventCallable<ResourceRequestKey>;
  createKey: (params: Params) => ResourceRequestKey;
};

type SubscriptionDiff<Params> = {
  added: Params[];
  removed: ResourceRequestKey[];
  next: ResourceRequestKey[];
};

/**
 * Keeps `resource` subscribed to exactly what `$desired` asks for, and to
 * nothing else — subscribing to what appears, unsubscribing from what leaves.
 *
 * The subtlety it exists to contain: `$desired` is rebuilt from scratch on
 * every chain and wallet update, so it republishes an equal-but-new array
 * constantly. Diffing by key means an unchanged set is a no-op, which matters
 * because the resource is ref-counted — blindly re-subscribing would inflate
 * the count and leave live subscriptions behind forever.
 *
 * Returns the keys currently held, for tests and diagnostics.
 */
export const wireSubscriptions = <Params>(resource: PooledResource<Params>, $desired: Store<Params[]>) => {
  const $subscribed = createStore<ResourceRequestKey[]>([]);

  // The resource's subscribe/unsubscribe are events; `scopeBind` keeps them bound
  // to the scope this ran in (tests fork a scope, the app does not).
  const syncFx = createEffect(({ added, removed }: SubscriptionDiff<Params>) => {
    const subscribe = scopeBind(resource.subscribe, { safe: true });
    const unsubscribe = scopeBind(resource.unsubscribe, { safe: true });

    for (const params of added) {
      subscribe(params);
    }
    for (const key of removed) {
      unsubscribe(key);
    }
  });

  sample({
    clock: $desired,
    source: $subscribed,
    filter: (subscribed, desired) => {
      if (subscribed.length !== desired.length) return true;
      const subscribedSet = new Set(subscribed);

      return desired.some(params => !subscribedSet.has(resource.createKey(params)));
    },
    fn: (subscribed, desired): SubscriptionDiff<Params> => {
      const next = desired.map(params => resource.createKey(params));
      const nextSet = new Set(next);
      const subscribedSet = new Set(subscribed);

      return {
        added: desired.filter(params => !subscribedSet.has(resource.createKey(params))),
        removed: subscribed.filter(key => !nextSet.has(key)),
        next,
      };
    },
    target: syncFx,
  });

  $subscribed.on(syncFx, (_, { next }) => next);

  return $subscribed;
};
