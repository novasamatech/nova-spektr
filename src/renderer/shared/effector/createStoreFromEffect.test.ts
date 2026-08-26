import { allSettled, createStore, fork } from 'effector';

import { createStoreFromEffect } from './createStoreFromEffect';

describe('createStoreFromEffect', () => {
  const setup = () => {
    const $param = createStore<string | null>(null);
    const fn = vi.fn<(args: { param: string }) => Promise<string>>();
    const result = createStoreFromEffect({
      params: { param: $param },
      defaultValue: 'default',
      fn,
    });

    return { $param, fn, ...result };
  };

  it('returns to default and surfaces the error when fn throws', async () => {
    const { $param, fn, $, $isDefaultValue, $error } = setup();
    const scope = fork();

    fn.mockResolvedValueOnce('ok');
    await allSettled($param, { scope, params: 'first' });

    expect(scope.getState($)).toBe('ok');
    expect(scope.getState($isDefaultValue)).toBe(false);
    expect(scope.getState($error)).toBeNull();

    const failure = new Error('boom');
    fn.mockRejectedValueOnce(failure);
    await allSettled($param, { scope, params: 'second' });

    expect(scope.getState($)).toBe('default');
    expect(scope.getState($isDefaultValue)).toBe(true);
    expect(scope.getState($error)).toBe(failure);
  });

  it('re-runs fn with the current params on retry and clears the error on success', async () => {
    const { $param, fn, $, $isDefaultValue, $error, retry } = setup();
    const scope = fork();

    fn.mockRejectedValueOnce(new Error('boom'));
    await allSettled($param, { scope, params: 'value' });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(scope.getState($error)).not.toBeNull();

    fn.mockResolvedValueOnce('recovered');
    await allSettled(retry, { scope });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith({ param: 'value' }, expect.any(AbortSignal));
    expect(scope.getState($error)).toBeNull();
    expect(scope.getState($)).toBe('recovered');
    expect(scope.getState($isDefaultValue)).toBe(false);
  });

  it('ignores retry while a param is null', async () => {
    const { fn, $, retry } = setup();
    const scope = fork();

    await allSettled(retry, { scope });

    expect(fn).not.toHaveBeenCalled();
    expect(scope.getState($)).toBe('default');
  });

  it('does not record the abort of a superseded run as an error', async () => {
    const { $param, fn, $, $error } = setup();
    const scope = fork();

    let resolveFirst = (_value: string) => {};
    fn.mockImplementationOnce(
      () =>
        new Promise<string>(resolve => {
          resolveFirst = resolve;
        }),
    );
    fn.mockResolvedValueOnce('second');

    const first = allSettled($param, { scope, params: 'first' });
    const second = allSettled($param, { scope, params: 'second' });
    resolveFirst('first');
    await Promise.all([first, second]);

    expect(scope.getState($error)).toBeNull();
    expect(scope.getState($)).toBe('second');
  });
});
