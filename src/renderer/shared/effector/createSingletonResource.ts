import { createStore, sample } from 'effector';
import { spread } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';

import { type DataStream, createResource } from './createResource';

type Config<Params, Value> = {
  create(config: { params: Params; stream: DataStream<Value> }): unknown;
};

export const createSingletonResource = <Params, Value>({ create }: Config<Params, Value>) => {
  const { open, close } = createResource<Params, Value>({ create });

  const $stream = createStore<DataStream<Value> | null>(null);

  sample({
    clock: open.doneData,
    source: $stream,
    filter: nonNullable,
    fn: existingStream => ({
      close: existingStream!,
      value: null,
    }),
    target: spread({
      close: close,
      value: $stream,
    }),
  });

  sample({
    clock: open.doneData,
    target: $stream,
  });

  return { open, close };
};
