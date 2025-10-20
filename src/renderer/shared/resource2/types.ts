import { type Event, type EventCallable, type Store } from 'effector';
import { type z } from 'zod';

export type ResourceRequestKey = string & z.$brand<'subscriptionKey'>;

export interface Resource<Params, Response, Cache> {
  push: Event<{ params: Params; result: Response }>;
  start: EventCallable<Params>;
  stop: EventCallable<ResourceRequestKey>;

  createKey(params: Params): ResourceRequestKey;

  $cache: Store<Cache>;
}

export type AnyResource<Params = any, Response = any, Cache = any> = Resource<Params, Response, Cache>;

export type InferResourceParams<R> = R extends AnyResource<infer I> ? I : never;
export type InferResourceResponse<R> = R extends Resource<any, infer I, any> ? I : never;
export type InferResourceCache<R> = R extends Resource<any, any, infer I> ? I : never;
