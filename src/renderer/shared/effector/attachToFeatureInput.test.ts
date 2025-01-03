import { allSettled, createEvent, createStore, fork, sample } from 'effector';

import { attachToFeatureInput } from './attachToFeatureInput';
import { createFeature } from './createFeature';

describe('attachToFeatureInput', () => {
  it('should work with store', async () => {
    const scope = fork();
    const $input = createStore<string>('hello');
    const $store = createStore<string>('world');
    const featureStatus = createFeature({ name: 'test/test', input: $input });

    const combinedEvent = attachToFeatureInput(featureStatus, $store);
    const $testStore = createStore<unknown>({});

    sample({
      clock: combinedEvent,
      target: $testStore,
    });

    await allSettled(featureStatus.start, { scope });
    expect(scope.getState($testStore)).toEqual({ input: 'hello', data: 'world' });

    await allSettled($input, { scope, params: 'goodbye' });
    expect(scope.getState($testStore)).toEqual({ input: 'goodbye', data: 'world' });

    await allSettled(featureStatus.stop, { scope });
    // nothing changed
    expect(scope.getState($testStore)).toEqual({ input: 'goodbye', data: 'world' });

    await allSettled($store, { scope, params: 'baby' });
    // nothing changed
    expect(scope.getState($testStore)).toEqual({ input: 'goodbye', data: 'world' });

    await allSettled($input, { scope, params: 'bye-bye' });
    await allSettled(featureStatus.start, { scope });
    // collect both values
    expect(scope.getState($testStore)).toEqual({ input: 'bye-bye', data: 'baby' });
  });

  it('should update with event fired first', async () => {
    const scope = fork();
    const $input = createStore<string>('hello');
    const event = createEvent<string>();
    const featureStatus = createFeature({ name: 'test/test', input: $input });

    const combinedEvent = attachToFeatureInput(featureStatus, event);
    const $testStore = createStore<unknown>({});

    sample({
      clock: combinedEvent,
      target: $testStore,
    });

    await allSettled(event, { scope, params: 'event' });
    await allSettled(featureStatus.start, { scope });
    expect(scope.getState($testStore)).toEqual({ input: 'hello', data: 'event' });
  });

  it('should update with event fired second', async () => {
    const scope = fork();
    const $input = createStore<string>('hello');
    const event = createEvent<string>();
    const featureStatus = createFeature({ name: 'test/test', input: $input });

    const combinedEvent = attachToFeatureInput(featureStatus, event);
    const $testStore = createStore<unknown>({});

    sample({
      clock: combinedEvent,
      target: $testStore,
    });

    await allSettled(featureStatus.start, { scope });
    await allSettled(event, { scope, params: 'event' });
    expect(scope.getState($testStore)).toEqual({ input: 'hello', data: 'event' });
  });

  it('should update with external event', async () => {
    const scope = fork();
    const $input = createStore<string>('hello');
    const event = createEvent<string>();
    const featureStatus = createFeature({ name: 'test/test', input: $input });

    const combinedEvent = attachToFeatureInput(featureStatus, event);
    const $testStore = createStore<unknown>({});

    sample({
      clock: combinedEvent,
      target: $testStore,
    });

    await allSettled(event, { scope, params: 'event' });
    await allSettled(featureStatus.start, { scope });
    await allSettled(event, { scope, params: 'world' });
    expect(scope.getState($testStore)).toEqual({ input: 'hello', data: 'world' });
  });

  it('should clear memoized source after feature stop', async () => {
    const scope = fork();
    const $input = createStore<string>('hello');
    const event = createEvent<string>();
    const featureStatus = createFeature({ name: 'test/test', input: $input });

    const combinedEvent = attachToFeatureInput(featureStatus, event);
    const $updates = createStore(0);

    sample({
      clock: combinedEvent,
      source: $updates,
      fn: (c) => c + 1,
      target: $updates,
    });

    // firing source event
    await allSettled(event, { scope, params: 'world' });
    // starting all usual, should call combined event
    await allSettled(featureStatus.start, { scope });
    // cleaning
    await allSettled(featureStatus.stop, { scope });
    // staring again
    await allSettled(featureStatus.start, { scope });

    expect(scope.getState($updates)).toBe(1);
  });
});
