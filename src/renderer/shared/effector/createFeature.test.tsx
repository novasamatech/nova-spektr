import { cleanup, render } from '@testing-library/react';
import { allSettled, createStore, fork } from 'effector';
import { Provider as ScopeProvider } from 'effector-react';

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

    const pipeline = createPipeline<string[], string>();
    const featureStatus = createFeature({ name: 'test', scope });
    await allSettled(featureStatus.start, { scope });

    featureStatus.inject(pipeline, (list, meta) => list.concat('1', meta));

    expect(pipeline.apply(['0'], 'meta')).toEqual(['0', '1', 'meta']);
  });

  it('should integrate with slot', async () => {
    const scope = fork();

    const slot = createSlot();
    const featureStatus = createFeature({ name: 'test', scope });

    featureStatus.inject(slot, () => <span>feature</span>);
    featureStatus.inject(slot, {
      render: () => <span>feature</span>,
    });

    const screenIdle = render(<>{slot.render()}</>);
    expect(screenIdle.container).toMatchInlineSnapshot(`
<div>
  <span>
    feature
  </span>
  <span>
    feature
  </span>
</div>
`);
  });

  it('should start feature when slot is rendered', async () => {
    const scope = fork();

    const slot = createSlot();
    const $input = createStore<{ ready: true }>({ ready: true });
    const featureStatus = createFeature({ name: 'test', input: $input, scope });

    featureStatus.inject(slot, () => <span>feature</span>);

    render(<>{slot.render()}</>, {
      wrapper: ({ children }) => <ScopeProvider value={scope}>{children}</ScopeProvider>,
    });
    expect(scope.getState(featureStatus.status)).toEqual('running');

    cleanup();
    expect(scope.getState(featureStatus.status)).toEqual('idle');
  });

  it('should skip slot when feature disabled', async () => {
    const scope = fork();

    const slot = createSlot();
    const $input = createStore<{ ready: true }>({ ready: true });
    const featureStatus = createFeature({ name: 'test', input: $input, enable: createStore(false), scope });

    featureStatus.inject(slot, () => <span>feature</span>);

    const screenIdle = render(<>{slot.render()}</>);
    expect(screenIdle.container).toMatchInlineSnapshot(`<div />`);
  });
});
