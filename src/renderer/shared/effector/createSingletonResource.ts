import { attach, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';

import { type DataStream, createResource } from './createStream';
import { series } from './series';

type Config<Params, Value> = {
  create(params: Params, stream: DataStream<Value>): unknown;
};

export const createSingletonResource = <const Params, const Value>({ create }: Config<Params, Value>) => {
  const { open, close } = createResource<Params, Value>({ create });

  const $pending = createStore(false);
  const streamClosed = series(createEvent<unknown>());
  const $stream = createStore<DataStream<Value> | null>(null);

  const closeFx = attach({
    source: $stream,
    async effect(stream) {
      if (stream) {
        await close(stream);
      }
    },
  });

  $pending.on(open.done, () => true).on(streamClosed, () => false);

  sample({
    clock: open.doneData,
    target: streamClosed,
  });

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

  return {
    open,
    close: closeFx,
    receiving: $pending,
  };
};
