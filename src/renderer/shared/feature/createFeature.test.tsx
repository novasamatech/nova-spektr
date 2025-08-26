import { cleanup, render } from '@testing-library/react';
import { allSettled, createStore, fork } from 'effector';
import { Provider as ScopeProvider } from 'effector-react';
import { describe, expect, it } from 'vitest';

import { createPipeline, createSlot } from '@/shared/di';

import { createFeature } from './createFeature';

describe('createFeature', () => {
  it('should integrate with pipeline', async () => {
    const scope = fork();

    const pipeline = createPipeline<string[], string>();
    const featureStatus = createFeature({ name: 'test/test', scope });
    await allSettled(featureStatus.start, { scope });

    featureStatus.inject(pipeline, (list, meta) => list.concat('1', meta));

    expect(pipeline(['0'], 'meta')).toEqual(['0', '1', 'meta']);
  });

  it('should integrate with slot', async () => {
    const scope = fork();

    const slot = createSlot();
    const featureStatus = createFeature({ name: 'test/test', scope });

    featureStatus.inject(slot, () => <span>feature</span>);

    const screenIdle = render(<>{slot.render({ props: undefined })}</>);
    expect(screenIdle.container).toMatchInlineSnapshot(`
<div>
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
    const featureStatus = createFeature({ name: 'test/test', input: $input, scope });

    featureStatus.inject(slot, () => <span>feature</span>);

    render(<>{slot.render({ props: undefined })}</>, {
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
    const featureStatus = createFeature({ name: 'test/test', input: $input, enable: createStore(false), scope });

    featureStatus.inject(slot, () => <span>feature</span>);

    const screenIdle = render(<>{slot.render({ props: undefined })}</>);
    expect(screenIdle.container).toMatchInlineSnapshot(`<div />`);
  });
});
