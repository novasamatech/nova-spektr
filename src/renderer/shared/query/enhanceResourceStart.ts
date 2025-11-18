import { type Effect, createEvent, sample } from 'effector';

import {
  type AnyResource,
  type InferResourceCache,
  type InferResourceParams,
  type InferResourceResponse,
} from './types';

type Params<EnhancedParams, Params> = {
  start: Effect<EnhancedParams, Params>;
};

export function enhanceResourceStart<Resource extends AnyResource, EnhancedParams>(
  resource: Resource,
  params: Params<EnhancedParams, InferResourceParams<Resource>>,
): AnyResource<EnhancedParams, InferResourceResponse<Resource>, InferResourceCache<Resource>> {
  const start = createEvent<EnhancedParams>();

  sample({
    clock: start,
    target: params.start,
  });

  sample({
    clock: params.start.doneData,
    target: resource.start,
  });

  return {
    start,
    stop: resource.stop,
    push: resource.push,
    $cache: resource.$cache,
    createKey: resource.createKey,
  };
}
