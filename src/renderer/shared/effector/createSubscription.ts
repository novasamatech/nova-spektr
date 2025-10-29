import { type EventCallable, type Store, combine, is, sample } from 'effector';
import { previous, readonly } from 'patronum';

import { nonNullable, nonNullableMap } from '@/shared/lib/utils';

function isNotEmpty<Args>(args: NullableArgs<Args> | null): args is Args {
  return nonNullable(args) && nonNullableMap(args);
}

type NullableArgs<T> = {
  [K in keyof T]: T[K] | null;
};

type Stores<Args> = {
  [K in keyof NullableArgs<Args>]: Store<Args[K]>;
};

type Params<Args> = {
  params: Stores<NullableArgs<Args>> | Store<NullableArgs<Args> | null>;
  subscribe: EventCallable<Args>;
  unsubscribe: EventCallable<Args>;
};

export function createSubscription<Args>({ params, subscribe, unsubscribe }: Params<Args>) {
  const $source = is.store(params) ? params : (combine(params) as Store<NullableArgs<Args> | null>);
  const $previous = previous($source);

  const canUnsubscribe = $previous.updates.filter({ fn: isNotEmpty });

  sample({
    source: $source,
    filter: isNotEmpty<Args>,
    target: subscribe,
  });

  sample({
    clock: readonly(canUnsubscribe),
    target: unsubscribe,
  });
}
