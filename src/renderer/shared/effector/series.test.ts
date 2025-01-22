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
});
