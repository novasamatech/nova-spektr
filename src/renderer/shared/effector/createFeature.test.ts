import { allSettled, createStore, fork } from 'effector';

import { createFeature } from './createFeature';

describe('createFeature', () => {
  it('should work', async () => {
    const scope = fork();
    const externalState = createStore<'test' | null>(null);
    const featureStatus = createFeature(externalState);

    await allSettled(featureStatus.start, { scope });
    expect(scope.getState(featureStatus.state)).toEqual({ status: 'starting' });

    await allSettled(externalState, { scope, params: 'test' });
    expect(scope.getState(featureStatus.state)).toEqual({ status: 'running', data: 'test' });

    await allSettled(externalState, { scope, params: null });
    expect(scope.getState(featureStatus.state)).toEqual({ status: 'starting' });

    await allSettled(featureStatus.stop, { scope });
    expect(scope.getState(featureStatus.state)).toEqual({ status: 'stale' });

    await allSettled(externalState, { scope, params: 'test' });
    await allSettled(featureStatus.start, { scope });
    expect(scope.getState(featureStatus.state)).toEqual({ status: 'running', data: 'test' });

    await allSettled(featureStatus.fail, { scope, params: new Error('test') });
    expect(scope.getState(featureStatus.state)).toEqual({ status: 'failed', error: new Error('test') });

    await allSettled(featureStatus.restore, { scope });
    expect(scope.getState(featureStatus.state)).toEqual({ status: 'running', data: 'test' });
  });
});
