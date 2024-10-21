import { render } from '@testing-library/react';
import { allSettled, createStore, fork } from 'effector';

import { createPipeline, createSlot } from '@/shared/di';

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

    expect(scope.getState(featureStatus.state)).toEqual({
      status: 'failed',
      type: 'fatal',
      error: new Error('test'),
      data: { ready: true },
    });

    await allSettled(featureStatus.restore, { scope });

    expect(scope.getState(featureStatus.state)).toEqual({ status: 'running', data: { ready: true } });
  });

  it('should integrate with pipeline', async () => {
    const scope = fork();

    const pipeline = createPipeline<string[]>();
    const $input = createStore<{ ready: true }>({ ready: true });
    const featureStatus = createFeature({ name: 'test', input: $input, scope });

    featureStatus.inject(pipeline, (list) => list.concat('1'));

    expect(pipeline.apply(['0'])).toEqual(['0']);

    await allSettled(featureStatus.start, { scope });

    expect(pipeline.apply(['0'])).toEqual(['0', '1']);
  });

  it('should integrate with slot', async () => {
    const scope = fork();

    const slot = createSlot();
    const $input = createStore<{ ready: true }>({ ready: true });
    const featureStatus = createFeature({ name: 'test', input: $input, scope });

    featureStatus.inject(slot, () => <span>feature</span>);

    const screenIdle = render(<>{slot.render()}</>);
    expect(screenIdle.container).toMatchInlineSnapshot(`<div />`);

    await allSettled(featureStatus.start, { scope });

    const screenStarted = render(<>{slot.render()}</>);
    expect(screenStarted.container).toMatchInlineSnapshot(`
<div>
  <span>
    feature
  </span>
</div>
`);
  });
});
