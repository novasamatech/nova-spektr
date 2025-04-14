import { createEvent } from 'effector';
import { readonly } from 'patronum';

import { createQueuedEffect } from '@/shared/effector';

import { type Resource } from './deriveFromResources';

type RemoteParams<Params, Response> = {
  fn(params: Params): Promise<Response>;
  pool?(params: Params): string;
  retryCount?: number;
  retryDelay?: number;
};

interface CreateRemoteResource<Params, Response> extends Resource<Response, Response> {
  request(params: Params): Promise<Response>;
}

export const createRemoteResource = <Params, Response>({
  pool,
  retryCount,
  retryDelay,
  fn,
}: RemoteParams<Params, Response>): CreateRemoteResource<Params, Response> => {
  const receive = createEvent<Response>();
  const push = createEvent<Response>();
  const requestFx = createQueuedEffect(fn, { pool, retryCount, retryDelay });

  return {
    receive,
    push: readonly(push),
    request: requestFx,
  };
};
