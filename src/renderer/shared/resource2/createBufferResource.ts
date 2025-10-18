import { createEvent, sample } from 'effector';
import { readonly } from 'patronum';

import { createBuffer } from '@/shared/effector';

import { type Resource } from './deriveFromResources';

type BufferParams<Data> = {
  timeframe: number;
  merge(buffer: Data[]): Data;
};

export type BufferResource<Data> = Resource<Data, Data, never>;

export const createBufferResource = <Data>({ timeframe, merge }: BufferParams<Data>): BufferResource<Data> => {
  const pull = createEvent<{ meta: never; result: Data }>();
  const push = createEvent<{ meta: never; result: Data }>();
  const buffer = createBuffer({ source: pull, timeframe });

  sample({
    clock: buffer,
    fn: (buffered) => ({
      result: merge(buffered.map((b) => b.result)),
      meta: null as never,
    }),
    target: push,
  });

  return {
    pull,
    push: readonly(push),
  };
};
