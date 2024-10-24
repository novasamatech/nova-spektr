import { type Event, type Store, createEvent, createStore, is, sample } from 'effector';
import { previous, readonly } from 'patronum';

import { shallowEqual } from '../lib/utils';

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

    // triggered by source
    const $prevSource = previous(source);

    sample({
      clock: source,
      source: { state: feature.state, prevSource: $prevSource },
      filter: ({ state, prevSource }, source) => state.status === 'running' && !shallowEqual(prevSource, source),
      fn: ({ state }, data) => {
        if (state.status !== 'running') {
          throw new Error('Incorrect feature status');
        }

        return { data, input: state.data };
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
