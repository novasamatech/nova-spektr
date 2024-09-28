import { type Event, type Store, createEvent, createStore, is, sample } from 'effector';
import { readonly } from 'patronum';

import { type createFeature } from './createFeature';

export const attachToFeatureInput = <Input, Data>(
  feature: ReturnType<typeof createFeature<Input>>,
  source: Store<Data> | Event<Data>,
) => {
  const combinedEvent = createEvent<{ input: Input; data: Data }>();

  if (is.store(source)) {
    // triggered by feature starting
    sample({
      clock: feature.running,
      source: source,
      fn: (data, input) => ({ data, input }),
      target: combinedEvent,
    });

    sample({
      clock: source,
      source: feature.state,
      filter: (featureState) => featureState.status === 'running',
      fn: (featureState, data) => {
        if (featureState.status !== 'running') {
          throw new Error('Incorrect feature status');
        }

        return { data, input: featureState.data };
      },
      target: combinedEvent,
    });
  }

  if (is.event(source)) {
    const empty = Symbol();
    const $storedSource = createStore<Data | typeof empty>(empty);

    sample({
      clock: source,
      target: $storedSource,
    });

    sample({
      clock: feature.running,
      source: $storedSource,
      filter: (data) => data !== empty,
      fn: (data, input) => ({ data: data as Data, input }),
      target: combinedEvent,
    });

    sample({
      clock: feature.stopped,
      fn: () => empty as never,
      target: $storedSource,
    });

    // copy paste because of types
    sample({
      clock: source,
      source: feature.state,
      filter: (featureState) => featureState.status === 'running',
      fn: (featureState, data) => {
        if (featureState.status !== 'running') {
          throw new Error('Incorrect feature status');
        }

        return { data, input: featureState.data };
      },
      target: combinedEvent,
    });
  }

  return readonly(combinedEvent);
};
