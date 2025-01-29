import { allSettled, createEffect, createEvent, createWatch, fork, sample } from 'effector';

import { series } from './series';

describe('series', () => {
  it('should spread array into events', async () => {
    const scope = fork();
    const spy = jest.fn();
    const targetEvent = createEvent<number>();
    const wrapped = series(targetEvent);

    createWatch({
      unit: targetEvent,
      fn: spy,
    });

    await allSettled(wrapped, { scope, params: [1, 2, 2, 3, 3, 3] });

    expect(spy).toHaveBeenCalledTimes(6);
    expect(spy.mock.calls).toEqual([[1], [2], [2], [3], [3], [3]]);
  });

  it('should work with sync iterable', async () => {
    const scope = fork();
    const spy = jest.fn();
    const targetEvent = createEvent<number>();
    const wrapped = series(targetEvent);

    const fx = createEffect(() => {
      const generator = function* () {
        yield 1;
        yield 2;
        yield 3;
      };

      return generator();
    });

    createWatch({
      unit: targetEvent,
      fn: spy,
    });

    sample({
      clock: fx.doneData,
      target: wrapped,
    });

    await allSettled(fx, { scope });

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls).toEqual([[1], [2], [3]]);
  });

  it('should work with async iterable', async () => {
    const scope = fork();
    const spy = jest.fn();
    const targetEvent = createEvent<number>();
    const wrapped = series(targetEvent);

    const fx = createEffect(() => {
      const generator = async function* () {
        yield 1;
        yield 2;
        yield 3;
      };

      return generator();
    });

    createWatch({
      unit: targetEvent,
      fn: spy,
    });

    sample({
      clock: fx.doneData,
      target: wrapped,
    });

    await allSettled(fx, { scope });

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls).toEqual([[1], [2], [3]]);
  });

  it('should collect doneData from wrapped effect', async () => {
    const scope = fork();
    const target = createEffect((n: number) => n + 1);
    const wrapped = series(target);

    const res = await allSettled(wrapped, { scope, params: [1, 2, 3] });

    expect(res.status).toBe('done');
    expect(res.status === 'done' ? res.value : []).toEqual([2, 3, 4]);
  });

  it('should not shuffle values with parallel option', async () => {
    const scope = fork();
    const target = createEffect((ttl: number) => new Promise(r => setTimeout(() => r(ttl), ttl)));
    const wrapped = series(target, { parallel: true });

    const res = await allSettled(wrapped, { scope, params: [3, 2, 1] });

    expect(res.status).toBe('done');
    expect(res.status === 'done' ? res.value : []).toEqual([3, 2, 1]);
  });

  it('should respect skipErrors option', async () => {
    const scope = fork();
    const target = createEffect(({ fail, value }: { value: number; fail: boolean }) => {
      return new Promise((resolve, reject) => (fail ? reject() : resolve(value)));
    });
    const wrapped = series(target, { skipErrors: true });

    const res = await allSettled(wrapped, {
      scope,
      params: [
        {
          value: 1,
          fail: false,
        },
        {
          value: 2,
          fail: true,
        },
        {
          value: 3,
          fail: false,
        },
      ],
    });

    expect(res.status).toBe('done');
    expect(res.status === 'done' ? res.value : []).toEqual([1, 3]);
  });
});
