import { type Event, type EventCallable, type StoreWritable, createStore, is, sample } from 'effector';

import { nonNullable } from '@/shared/lib/utils';

// resource

export interface Resource<Input, Output> {
  pull: EventCallable<Input>;
  push: Event<Output>;
}

export type InferRecourceInput<R> = R extends Resource<infer I, any> ? I : never;
export type InferResourceOutput<R> = R extends Resource<any, infer O> ? O : never;

type ResourcesChain<T extends any[]> = T extends [infer Head, infer Second, ...infer Tail]
  ? InferResourceOutput<Second> extends InferRecourceInput<Head>
    ? [Head, ...ResourcesChain<[Second, ...Tail]>]
    : { error: 'Resources input and output are not compatable' }
  : T;

type ResourcesFirstOutput<T extends any[]> = T extends [infer Head, ...unknown[]] ? InferResourceOutput<Head> : never;

// storage

type DerivedParams<State, Resources extends any[]> = {
  store: StoreWritable<State> | State;
  resources: ResourcesChain<Resources>;
  map(state: NoInfer<State>, input: ResourcesFirstOutput<Resources>): State;
};

export function deriveFromResources<State, const Resources extends Resource<any, any>[]>({
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
    sample({
      clock: closestResource.push,
      source: $state,
      fn: (state, resource) => map(state, resource),
      target: $state,
    });
  }
}
