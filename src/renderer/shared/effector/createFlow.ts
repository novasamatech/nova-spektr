import { type EventCallable, type Store, createEvent, createStore, sample } from 'effector';
import { useEffect } from 'react';

import { usePrevious } from '@/shared/lib/hooks';
import { shallowEqual } from '@/shared/lib/utils';

type Flow<Props> = {
  open: EventCallable<Props>;
  close: EventCallable<Props>;
  shut: EventCallable<void>;
  status: Store<boolean>;
  state: Store<Props>;
};

export const createFlow = <Props>(defaultState: Props): Flow<Props> => {
  const $state = createStore(defaultState);
  const $status = createStore(false);

  const $stack = createStore<Props[]>([]);
  const open = createEvent<Props>();
  const close = createEvent<Props>();
  const shut = createEvent();

  // debug($stack, $state);

  sample({
    clock: open,
    source: $stack,
    fn: (stack, props) => stack.concat(props),
    target: $stack,
  });

  sample({
    clock: close,
    source: $stack,
    fn: (stack, props) => stack.filter(s => s !== props),
    target: $stack,
  });

  sample({
    clock: shut,
    fn: () => [],
    target: $stack,
  });

  sample({
    clock: $stack.updates,
    filter: stack => stack.length > 0,
    fn: () => true,
    target: $status,
  });

  sample({
    clock: $stack.updates,
    filter: stack => stack.length === 0,
    fn: () => true,
    target: $status,
  });

  sample({
    clock: $stack.updates,
    fn: stack => stack.at(-1) ?? defaultState,
    target: $state,
  });

  return {
    open,
    close,
    shut,
    status: $status,
    state: $state,
  };
};

export const useFlow = <Props>(flow: Flow<Props>, props: NoInfer<Props>) => {
  const previous = usePrevious(props);
  useEffect(() => {
    flow.open(props);
    return () => {
      flow.close(props);
    };
  }, []);
  useEffect(() => {
    if (!shallowEqual(previous, props)) {
      flow.open(props);
      return () => {
        flow.close(props);
      };
    }
  }, [previous, props]);
};
