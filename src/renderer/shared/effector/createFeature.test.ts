import { allSettled, createStore, fork } from 'effector';

import { createFeature } from './createFeature';

describe('createFeature', () => {
  it('should work', async () => {
    const scope = fork();
    const $input = createStore<{ ready: true } | null>(null);
    const featureStatus = createFeature({ name: 'test', input: $input });

    await allSettled(featureStatus.start, { scope });

    expect(scope.getState(featureStatus.state)).toEqual({ status: 'starting' });

    await allSettled($input, { scope, params: { ready: true } });

    expect(scope.getState(featureStatus.state)).toEqual({ status: 'running', data: { ready: true } });

    await allSettled($input, { scope, params: null });

    expect(scope.getState(featureStatus.state)).toEqual({ status: 'starting' });

    await allSettled(featureStatus.stop, { scope });

    expect(scope.getState(featureStatus.state)).toEqual({ status: 'idle' });

    await allSettled($input, { scope, params: { ready: true } });
    await allSettled(featureStatus.start, { scope });

    expect(scope.getState(featureStatus.state)).toEqual({ status: 'running', data: { ready: true } });

    await allSettled(featureStatus.fail, { scope, params: { type: 'fatal', error: new Error('test') } });

    expect(scope.getState(featureStatus.state)).toEqual({ status: 'failed', type: 'fatal', error: new Error('test') });

    await allSettled(featureStatus.restore, { scope });

    expect(scope.getState(featureStatus.state)).toEqual({ status: 'running', data: { ready: true } });
  });
});
