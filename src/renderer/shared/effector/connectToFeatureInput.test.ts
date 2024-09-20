import { allSettled, createStore, fork, sample } from 'effector';

import { connectToFeatureInput } from './connectToFeatureInput';
import { createFeature } from './createFeature';

describe('connectToFeatureInput', () => {
  it('should work', async () => {
    const scope = fork();
    const $input = createStore<string>('hello');
    const $store = createStore<string>('world');
    const featureStatus = createFeature($input);

    const updatesEvent = connectToFeatureInput(featureStatus, $store);
    const $testStore = createStore<unknown>({});

    sample({
      clock: updatesEvent,
      target: $testStore,
    });

    await allSettled(featureStatus.start, { scope });
    expect(scope.getState($testStore)).toEqual({ input: 'hello', store: 'world' });

    await allSettled($input, { scope, params: 'goodbye' });
    expect(scope.getState($testStore)).toEqual({ input: 'goodbye', store: 'world' });

    await allSettled(featureStatus.stop, { scope });
    // nothing changed
    expect(scope.getState($testStore)).toEqual({ input: 'goodbye', store: 'world' });

    await allSettled($store, { scope, params: 'baby' });
    // nothing changed
    expect(scope.getState($testStore)).toEqual({ input: 'goodbye', store: 'world' });

    await allSettled($input, { scope, params: 'bye-bye' });
    await allSettled(featureStatus.start, { scope });
    // collect both values
    expect(scope.getState($testStore)).toEqual({ input: 'bye-bye', store: 'baby' });
  });
});
