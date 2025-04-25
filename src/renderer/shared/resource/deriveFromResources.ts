import { type Event, type EventCallable, type Store, type StoreWritable, createStore, is, sample } from 'effector';

import { nonNullable } from '@/shared/lib/utils';

// resource

export interface Resource<Input, Output, Metadata = unknown> {
  pull: EventCallable<Input>;
  push: Event<Output>;
  metadata?: Store<Metadata>;
}

export type InferRecourceInput<R> = R extends Resource<infer I, any, any> ? I : never;
export type InferResourceOutput<R> = R extends Resource<any, infer O, any> ? O : never;
export type InferResourceMetadata<R> = R extends Resource<any, any, infer M> ? M : never;

type ResourcesChain<T extends any[]> = T extends [infer Head, infer Second, ...infer Tail]
  ? InferResourceOutput<Second> extends InferRecourceInput<Head>
    ? [Head, ...ResourcesChain<[Second, ...Tail]>]
    : { error: 'Resources input and output are not compatable' }
  : T;

type ResourcesFirstOutput<T extends any[]> = T extends [infer Head, ...unknown[]] ? InferResourceOutput<Head> : never;
type ResourcesFirstMetadata<T extends any[]> = T extends [infer Head, ...unknown[]]
  ? InferResourceMetadata<Head>
  : never;

// storage

type DerivedParams<State, Resources extends any[]> = {
  store: StoreWritable<State> | State;
  resources: ResourcesChain<Resources>;
  map(
    state: NoInfer<State>,
    input: ResourcesFirstOutput<Resources>,
    metadata?: ResourcesFirstMetadata<Resources>,
  ): State;
};

export function deriveFromResources<State, const Resources extends Resource<any, any, any>[]>({
  store,
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
        target: nextResource.pull,
      });
    }
  }

  const closestResource = resources.at(0);
  if (closestResource) {
    if (closestResource.metadata) {
      sample({
        clock: closestResource.push,
        source: { state: $state, metadata: closestResource.metadata },
        fn: ({ state, metadata }, resourceData) => map(state, resourceData, metadata),
        target: $state,
      });
    } else {
      sample({
        clock: closestResource.push,
        source: $state,
        fn: (state, resourceData) => map(state, resourceData, undefined),
        target: $state,
      });
    }
  }
}
