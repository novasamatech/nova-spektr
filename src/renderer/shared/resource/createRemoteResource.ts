import { type Effect, attach, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { createQueuedEffect } from '@/shared/effector';
import { nonNullable } from '@/shared/lib/utils';

import { type Resource } from './deriveFromResources';

type RemoteParams<Params, Response> = {
  fn(params: Params): Response | Promise<Response>;
  pool?(params: Params): string;
  retryCount?: number;
  retryDelay?: number;
  once?: boolean;
};

interface RemoteResource<Params, Response> extends Resource<Response, Response> {
  request: Effect<Params, Awaited<Response>>;
}

export const createRemoteResource = <Params, Response>({
  pool = () => '_',
  once = false,
  retryCount,
  retryDelay,
  fn,
}: RemoteParams<Params, Response>): RemoteResource<Params, Response> => {
  const $lastResponses = createStore<Record<string, Response>>({});
  const $once = createStore(once);
  const receive = createEvent<Response>();
  const push = createEvent<Response>();
  const requestFx = createQueuedEffect<Params, Response>(fn, { pool, retryCount, retryDelay });

  const wrappedFx = attach({
    source: $lastResponses,
    async effect(lastResponses, params: Params) {
      const key = pool(params);
      const last = lastResponses[key];
      if (once && nonNullable(last)) {
        return last as Response;
      }
      return requestFx(params);
    },
  });

  sample({
    clock: requestFx.doneData,
    target: push,
  });

  sample({
    clock: requestFx.done,
    source: $lastResponses,
    filter: $once,
    fn(last, { params, result }) {
      const key = pool(params);

      return {
        ...last,
        [key]: result,
      };
    },
    target: $lastResponses,
  });

  // redirecting data
  sample({
    clock: receive,
    target: push,
  });

  return {
    receive,
    push: readonly(push),
    // @ts-expect-error weird Awaited type error
    request: wrappedFx,
  };
};
