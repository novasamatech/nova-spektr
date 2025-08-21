import { setTimeout } from 'node:timers/promises';

import { createAsyncTaskPool } from './createAsyncTaskPool';

const delay = (ttl: number = 0) => setTimeout(ttl);

describe('asyncTaskPool', () => {
  it('should exec sync task', async () => {
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: () => 0 });
    const result = await pool.call(() => 'test');

    expect(result).toBe('test');
  });

  it('should exec async task', async () => {
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: () => 0 });
    const result = await pool.call(() => delay().then(() => 'test'));

    expect(result).toBe('test');
  });

  it('should handle sync errors', async () => {
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: () => 0 });
    const error = new Error('test');
    const result = pool.call(() => {
      throw error;
    });

    return expect(result).rejects.toThrowError(error);
  });

  it('should handle async errors', async () => {
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: () => 0 });
    const error = new Error('test');
    const result = pool.call(() => Promise.reject(error));

    return expect(result).rejects.toThrowError(error);
  });

  it('should handle queue', async () => {
    const pool = createAsyncTaskPool({ poolSize: 2, retryCount: 0, retryDelay: () => 0 });
    const spy = vi.fn();

    await Promise.all([pool.call(spy), pool.call(spy), pool.call(spy), pool.call(spy)]);

    expect(spy).toBeCalledTimes(4);
  });

  it('should update pool in correct order', async () => {
    const pool = createAsyncTaskPool({ poolSize: 2, retryCount: 0, retryDelay: () => 0 });
    const result: number[] = [];

    const res = Promise.all([
      pool.call(() => delay(800).then(() => result.push(1))),
      pool.call(() => delay(100).then(() => result.push(2))),
      pool.call(() => delay(500).then(() => result.push(3))),
      pool.call(() => delay(100).then(() => result.push(4))),
    ]);

    await res;

    expect(result).toEqual([2, 3, 4, 1]);
  });

  it('should retry', async () => {
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 1, retryDelay: () => 0 });
    let tries = 0;

    const result = await pool.call(() => {
      if (tries === 1) {
        return 'test';
      }
      tries++;
      throw new Error();
    });

    expect(result).toEqual('test');
  });

  it('should throw on retry limit exceeding', async () => {
    const spy = vi.fn(() => 0);
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 1, retryDelay: spy });
    let tries = 0;

    const result = pool.call(() => {
      if (tries === 2) {
        return 'test';
      }
      tries++;
      throw new Error();
    });

    expect(spy).toBeCalledTimes(1);
    await expect(result).rejects.toThrowError();
  });

  it('should correctly calculate retry delay', async () => {
    const spy = vi.fn((retry: number) => retry * 10);
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 2, retryDelay: spy });
    let tries = 0;

    await pool.call(() => {
      if (tries === 2) {
        return 'test';
      }
      tries++;
      throw new Error();
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls).toEqual([[0], [1]]);
  });

  it('should create multiple pools', async () => {
    const spy = vi.fn();
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: 0 });
    const tasks = [
      { delay: 600, value: 1, pool: '1' },
      { delay: 400, value: 2, pool: '2' },
      { delay: 100, value: 3, pool: '1' },
      { delay: 0, value: 4, pool: '2' },
    ];

    const result: Promise<unknown>[] = [];

    for (const task of tasks) {
      const call = pool.call(() => delay(task.delay).then(() => spy(task.value)), { pool: task.pool });
      result.push(call);
    }

    await Promise.all(result);

    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy.mock.calls).toEqual([[2], [4], [1], [3]]);
  }, 10000);

  it('should settle all tasks', async () => {
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: 0 });
    const tasks = [
      { delay: 0, value: 1 },
      { delay: 0, value: 2 },
      { delay: 0, value: 3 },
      { delay: 0, value: 4 },
    ];

    const result: number[] = [];

    for (const task of tasks) {
      pool
        .call(() => delay(task.delay))
        .then(() => {
          result.push(task.value);
        });
    }

    await pool.settle();

    expect(result).toEqual([1, 2, 3, 4]);
  });

  it('should settle tasks that was created by chain reaction', async () => {
    const pool = createAsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: 0 });
    const tasks = [
      { delay: 0, value: 1 },
      { delay: 0, value: 2 },
      { delay: 0, value: 3 },
      { delay: 0, value: 4 },
    ];

    const result: number[] = [];

    for (const task of tasks) {
      pool
        .call(() => delay(task.delay))
        .then(() => {
          result.push(task.value);
          pool.call(() => delay(task.delay).then(() => result.push(task.value + 10)));
        });
    }

    await pool.settle();

    expect(result).toEqual([1, 2, 3, 4, 11, 12, 13, 14]);
  });
});
