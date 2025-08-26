import { type Event, type EventCallable, type StoreWritable, createStore, is, sample } from 'effector';

import { nonNullable } from '@/shared/lib/utils';

// resource

export interface Resource<Input, Output, Metadata> {
  pull: EventCallable<{ meta: never; result: Input }>;
  push: Event<{ meta: Metadata; result: Output }>;
}

export type InferResourceInput<R> = R extends Resource<infer I, any, any> ? I : never;
export type InferResourceOutput<R> = R extends Resource<any, infer O, any> ? O : never;
export type InferResourceMetadata<R> = R extends Resource<any, any, infer M> ? M : never;

type ResourcesChain<T extends any[]> = T extends [infer Head, infer Second, ...infer Tail]
  ? InferResourceOutput<Second> extends InferResourceInput<Head>
    ? [Head, ...ResourcesChain<[Second, ...Tail]>]
    : { error: 'Resources input and output are not compatable' }
  : T;

type ResourcesMetadata<T extends any[]> = T extends [infer Head, ...infer Tail]
  ? [InferResourceMetadata<Head>, ResourcesMetadata<Tail>][number]
  : never;

type ResourcesFirstOutput<T extends any[]> = T extends [infer Head, ...unknown[]] ? InferResourceOutput<Head> : never;

// storage

type DerivedParams<State, Resources extends any[]> = {
  store: StoreWritable<State> | State;
  onReceive?: EventCallable<NoInfer<ResourcesFirstOutput<Resources>>>;
  resources: ResourcesChain<Resources>;
  map(state: NoInfer<State>, input: ResourcesFirstOutput<Resources>, metadata: ResourcesMetadata<Resources>): State;
};

export function deriveFromResources<State, const Resources extends Resource<any, any, any>[]>({
  store,
  onReceive,
  resources,
  map,
}: DerivedParams<State, Resources>) {
  const $state = is.store(store) ? store : createStore(store);

  for (let i = resources.length - 1; i >= 0; i--) {
    const resource = resources[i];
    const nextResource = resources[i - 1];
    if (nonNullable(resource) && nonNullable(nextResource)) {
      sample({
        clock: resource.push,
        fn: ({ result, meta }) => ({
          result,
          meta: meta as never,
        }),
        target: nextResource.pull,
      });
    }
  }

  const closestResource = resources.at(0);
  if (closestResource) {
    if (onReceive) {
      sample({
        clock: closestResource.push,
        fn: ({ result }) => result,
        target: onReceive,
      });
    }

    sample({
      clock: closestResource.push,
      source: $state,
      fn: (state, { meta, result }) => map(state, result, meta),
      target: $state,
    });
  }
}
