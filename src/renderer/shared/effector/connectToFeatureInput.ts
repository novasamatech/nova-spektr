import { type Store, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type createFeature } from './createFeature';

export const connectToFeatureInput = <Input, Source>(
  feature: ReturnType<typeof createFeature<Input>>,
  source: Store<Source>,
) => {
  const empty = Symbol();

  const $eventValue = createStore<Input | typeof empty>(empty);
  const combinedEvent = createEvent<{ input: Input; store: Source }>();

  sample({
    clock: feature.running,
    target: $eventValue,
  });

  sample({
    clock: feature.running,
    source: source,
    fn: (store, input) => ({ store, input }),
    target: combinedEvent,
  });

  sample({
    clock: source.updates,
    source: feature.state,
    filter: (featureState) => featureState.status === 'running',
    fn: (featureState, store) => {
      if (featureState.status !== 'running') {
        throw new Error('Incorrect feature status');
      }

      return { store, input: featureState.data };
    },
    target: combinedEvent,
  });

  return readonly(combinedEvent);
};
