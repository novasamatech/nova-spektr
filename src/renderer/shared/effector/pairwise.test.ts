import { allSettled, createStore, createWatch, fork } from 'effector';

import { pairwise } from './pairwise';

describe('pairwise', () => {
  it('should skip first update and emit subsequent pairs', async () => {
    const scope = fork();
    const $counter = createStore(0);
    const spy = vi.fn();

    createWatch({ unit: pairwise($counter), fn: spy });

    await allSettled($counter, { scope, params: 1 });
    expect(spy).not.toHaveBeenCalled();

    await allSettled($counter, { scope, params: 2 });
    expect(spy).toHaveBeenCalledWith({ prev: 1, current: 2 });

    await allSettled($counter, { scope, params: 3 });
    expect(spy).toHaveBeenCalledWith({ prev: 2, current: 3 });
  });

  it('should work with .map()', async () => {
    const scope = fork();
    const $counter = createStore(0);
    const spy = vi.fn();

    const delta = pairwise($counter).map(({ prev, current }) => current - prev);
    createWatch({ unit: delta, fn: spy });

    await allSettled($counter, { scope, params: 5 });
    await allSettled($counter, { scope, params: 10 });
    await allSettled($counter, { scope, params: 7 });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 5);
    expect(spy).toHaveBeenNthCalledWith(2, -3);
  });

  it('should work with .filter()', async () => {
    const scope = fork();
    const $counter = createStore(0);
    const spy = vi.fn();

    const increased = pairwise($counter).filter({ fn: ({ prev, current }) => current > prev });
    createWatch({ unit: increased, fn: spy });

    await allSettled($counter, { scope, params: 5 });
    await allSettled($counter, { scope, params: 10 });
    await allSettled($counter, { scope, params: 7 });
    await allSettled($counter, { scope, params: 15 });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, { prev: 5, current: 10 });
    expect(spy).toHaveBeenNthCalledWith(2, { prev: 7, current: 15 });
  });

  it('should chain .map() and .filter()', async () => {
    const scope = fork();
    const $counter = createStore(0);
    const spy = vi.fn();

    const largeDelta = pairwise($counter)
      .map(({ prev, current }) => current - prev)
      .filter({ fn: delta => Math.abs(delta) > 3 });

    createWatch({ unit: largeDelta, fn: spy });

    await allSettled($counter, { scope, params: 0 });
    await allSettled($counter, { scope, params: 2 });
    await allSettled($counter, { scope, params: 7 });
    await allSettled($counter, { scope, params: 1 });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 5);
    expect(spy).toHaveBeenNthCalledWith(2, -6);
  });

  it('should work with arrays', async () => {
    const scope = fork();
    const $items = createStore<number[]>([]);
    const spy = vi.fn();

    const added = pairwise($items)
      .map(({ prev, current }) => current.filter(item => !prev.includes(item)))
      .filter({ fn: items => items.length > 0 });

    createWatch({ unit: added, fn: spy });

    await allSettled($items, { scope, params: [1, 2] });
    await allSettled($items, { scope, params: [1, 2, 3, 4] });

    expect(spy).toHaveBeenCalledWith([3, 4]);
  });
});
