import { setTimeout } from 'node:timers/promises';

import { allSettled, createWatch, fork } from 'effector';

import { createQueuedEffect } from './createQueuedEffect';

describe('createQueuedEffect', () => {
  it('should create queue', async () => {
    type Params = { delay: number; value: number };

    const scope = fork();
    const spy = jest.fn();
    const fx = createQueuedEffect((params: Params) => {
      return setTimeout(params.delay).then(() => params.value);
    });

    createWatch({
      unit: fx.doneData,
      fn: spy,
    });

    const testData: Params[] = [
      { delay: 400, value: 1 },
      { delay: 300, value: 2 },
      { delay: 200, value: 3 },
      { delay: 100, value: 4 },
    ];

    const requests: Promise<unknown>[] = [];

    for (const data of testData) {
      const request = allSettled(fx, { scope, params: data });
      requests.push(request);
    }

    await Promise.all(requests);

    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy.mock.calls).toEqual([[1], [2], [3], [4]]);
  });

  it('should create separated queues', async () => {
    type Params = { delay: number; value: number; pool: string };

    const scope = fork();
    const spy = jest.fn();
    const fx = createQueuedEffect((params: Params) => setTimeout(params.delay).then(() => params.value), {
      pool: ({ pool }) => pool,
    });

    createWatch({
      unit: fx.doneData,
      fn: spy,
    });

    const testData: Params[] = [
      { delay: 400, value: 1, pool: '1' },
      { delay: 300, value: 2, pool: '2' },
      { delay: 500, value: 3, pool: '1' },
      { delay: 100, value: 4, pool: '2' },
    ];

    const requests: Promise<unknown>[] = [];

    for (const data of testData) {
      const request = allSettled(fx, { scope, params: data });
      requests.push(request);
    }

    await Promise.all(requests);

    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy.mock.calls).toEqual([[2], [1], [4], [3]]);
  });
});
