import { allSettled, createStore, fork } from 'effector';

import { createCombine, isCombineIdentifier } from './createCombine';

describe('createCombine', () => {
  it('should check type', () => {
    expect(
      isCombineIdentifier(createCombine<unknown, undefined>({ defaultValue: undefined, fn: () => undefined })),
    ).toBeTruthy();
    expect(isCombineIdentifier({})).toBeFalsy();
  });

  it('should handle simple case with array concat', async () => {
    const scope = fork();
    const $store1 = createStore('1');
    const $store2 = createStore('2');

    const combine = createCombine<string, string>({
      defaultValue: '',
      fn: (...strings) => strings.join(','),
    });

    await allSettled(combine.registerHandler, { scope, params: { body: $store1, available: () => true } });
    await allSettled(combine.registerHandler, { scope, params: { body: $store2, available: () => true } });

    expect(scope.getState(combine.store)).toEqual('1,2');
  });

  it('should react to new value', async () => {
    const scope = fork();
    const $store1 = createStore('1');
    const $store2 = createStore('2');

    const combine = createCombine<string, string>({
      defaultValue: '',
      fn: (...strings) => strings.join(','),
    });

    await allSettled(combine.registerHandler, { scope, params: { body: $store1, available: () => true } });
    await allSettled(combine.registerHandler, { scope, params: { body: $store2, available: () => true } });
    await allSettled($store1, { scope, params: '2' });

    expect(scope.getState(combine.store)).toEqual('2,2');
  });

  it('should register new handler', async () => {
    const scope = fork();
    const $store1 = createStore('1');
    const $store2 = createStore('2');
    const $store3 = createStore('3');

    const combine = createCombine<string, string>({
      defaultValue: '',
      fn: (...strings) => strings.join(','),
    });

    await allSettled(combine.registerHandler, { scope, params: { body: $store1, available: () => true } });
    await allSettled(combine.registerHandler, { scope, params: { body: $store2, available: () => true } });

    expect(scope.getState(combine.store)).toEqual('1,2');

    await allSettled(combine.registerHandler, { scope, params: { body: $store3, available: () => true } });

    expect(scope.getState(combine.store)).toEqual('1,2,3');
  });

  it('should skip not avalable stores', async () => {
    const scope = fork();
    const $store1 = createStore('1');
    const $store2 = createStore('2');
    const $store3 = createStore('3');

    const combine = createCombine<string, string>({
      defaultValue: '',
      fn: (...strings) => strings.join(','),
    });

    await allSettled(combine.registerHandler, { scope, params: { body: $store1, available: () => true } });
    await allSettled(combine.registerHandler, { scope, params: { body: $store2, available: () => false } });
    await allSettled(combine.registerHandler, { scope, params: { body: $store3, available: () => true } });

    expect(scope.getState(combine.store)).toEqual('1,3');
  });
});
