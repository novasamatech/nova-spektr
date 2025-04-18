import { createEvent, sample } from 'effector';
import { readonly } from 'patronum';

import { createBuffer } from '@/shared/effector';

import { type Resource } from './deriveFromResources';

type BufferParams<Data> = {
  timeframe: number;
  merge(buffer: Data[]): Data;
};

export type BufferResource<Data> = Resource<Data, Data>;

export const createBufferResource = <Data>({ timeframe, merge }: BufferParams<Data>): BufferResource<Data> => {
  const pull = createEvent<Data>();
  const push = createEvent<Data>();
  const buffer = createBuffer({ source: pull, timeframe });

  sample({
    clock: buffer,
    fn: merge,
    target: push,
  });

  return {
    pull,
    push: readonly(push),
  };
};
