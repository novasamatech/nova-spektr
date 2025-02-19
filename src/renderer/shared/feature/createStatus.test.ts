import { allSettled, createStore, fork } from 'effector';
import { describe, it } from 'vitest';

import { createStatus } from './createStatus';

describe('createStatus', () => {
  it('should start and stop', async () => {
    const scope = fork();
    const { $state, start, stop } = createStatus({
      enable: createStore(true),
      input: createStore({ input: true }),
      reasons: ['test'],
    });

    await allSettled(start, { params: 'test', scope });
    expect(scope.getState($state)).toEqual({ status: 'running', data: { input: true } });

    await allSettled(stop, { params: 'test', scope });
    expect(scope.getState($state)).toEqual({ status: 'idle' });
  });

  it('should wait until input got resolved', async () => {
    const scope = fork();
    const $input = createStore<string | null>(null);

    const { $state, start } = createStatus({
      enable: createStore(true),
      input: $input,
      reasons: ['test'],
    });

    await allSettled(start, { params: 'test', scope });
    expect(scope.getState($state)).toEqual({ status: 'starting' });

    await allSettled($input, { params: 'enabled', scope });
    expect(scope.getState($state)).toEqual({ status: 'running', data: 'enabled' });
  });

  it('should break start if status is disabled', async () => {
    const scope = fork();
    const $enable = createStore(false);

    const { $state, start } = createStatus({
      enable: $enable,
      input: createStore({}),
      reasons: ['test'],
    });

    await allSettled(start, { params: 'test', scope });
    expect(scope.getState($state)).toEqual({ status: 'idle' });

    await allSettled($enable, { params: true, scope });
    expect(scope.getState($state)).toEqual({ status: 'running', data: {} });

    await allSettled($enable, { params: false, scope });
    expect(scope.getState($state)).toEqual({ status: 'idle' });
  });

  it('should start if filter returns empty value', async () => {
    const scope = fork();

    const { $state, start } = createStatus({
      enable: createStore(true),
      input: createStore({}),
      filter: () => null,
      reasons: ['test'],
    });

    await allSettled(start, { params: 'test', scope });
    expect(scope.getState($state)).toEqual({ status: 'running', data: {} });
  });

  it('should get idle status from filter', async () => {
    const scope = fork();

    const { $state, start } = createStatus({
      enable: createStore(true),
      input: createStore({}),
      filter: () => ({ status: 'idle' }),
      reasons: ['test'],
    });

    await allSettled(start, { params: 'test', scope });
    expect(scope.getState($state)).toEqual({ status: 'idle' });
  });

  it('should get failed status from filter', async () => {
    const scope = fork();

    const { $state, start } = createStatus({
      enable: createStore(true),
      input: createStore({}),
      filter: () => ({
        status: 'failed',
        type: 'error',
        error: new Error('test'),
      }),
      reasons: ['test'],
    });

    await allSettled(start, { params: 'test', scope });
    expect(scope.getState($state)).toEqual({ status: 'failed', data: {}, type: 'error', error: new Error('test') });
  });

  it('should recalculate status with filter when input changes', async () => {
    const scope = fork();
    const $input = createStore({ failed: true });

    const { $state, start } = createStatus({
      enable: createStore(true),
      input: $input,
      filter: ({ failed }) =>
        failed
          ? {
              status: 'failed',
              type: 'error',
              error: new Error('test'),
            }
          : null,
      reasons: ['test'],
    });

    await allSettled(start, { params: 'test', scope });
    expect(scope.getState($state)).toEqual({
      status: 'failed',
      type: 'error',
      error: new Error('test'),
      data: { failed: true },
    });

    await allSettled($input, { params: { failed: false }, scope });
    expect(scope.getState($state)).toEqual({ status: 'running', data: { failed: false } });
  });

  it('should restore after fail', async () => {
    const scope = fork();
    const $input = createStore({});

    const { $state, start, fail, restore } = createStatus({
      enable: createStore(true),
      input: $input,
      reasons: ['test'],
    });

    await allSettled(start, { params: 'test', scope });
    await allSettled(fail, { params: { type: 'error', error: new Error('test') }, scope });
    expect(scope.getState($state)).toEqual({
      status: 'failed',
      type: 'error',
      error: new Error('test'),
      data: {},
    });

    await allSettled(restore, { scope });
    expect(scope.getState($state)).toEqual({ status: 'running', data: {} });
  });
});
