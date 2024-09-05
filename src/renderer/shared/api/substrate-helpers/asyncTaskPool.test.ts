import { AsyncTaskPool } from './asyncTaskPool';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('asyncTaskPool', () => {
  it('should exec sync task', async () => {
    const pool = new AsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: () => 0 });
    const result = await pool.call(() => 'test');

    expect(result).toBe('test');
  });

  it('should exec async task', async () => {
    const pool = new AsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: () => 0 });
    const result = await pool.call(() => delay(10).then(() => 'test'));

    expect(result).toBe('test');
  });

  it('should handle sync errors', async () => {
    const pool = new AsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: () => 0 });
    const error = new Error('test');
    const result = pool.call(() => {
      throw error;
    });

    return expect(result).rejects.toThrowError(error);
  });

  it('should handle async errors', async () => {
    const pool = new AsyncTaskPool({ poolSize: 1, retryCount: 0, retryDelay: () => 0 });
    const error = new Error('test');
    const result = pool.call(() => Promise.reject(error));

    return expect(result).rejects.toBe(error);
  });

  it('should handle queue', async () => {
    const pool = new AsyncTaskPool({ poolSize: 2, retryCount: 0, retryDelay: () => 0 });
    const spy = jest.fn();

    await Promise.all([pool.call(spy), pool.call(spy), pool.call(spy), pool.call(spy)]);

    expect(spy).toBeCalledTimes(4);
  });

  it('should update pool in correct order', async () => {
    const pool = new AsyncTaskPool({ poolSize: 2, retryCount: 0, retryDelay: () => 0 });
    const result: number[] = [];

    await Promise.all([
      pool.call(() => delay(800).then(() => result.push(1))),
      pool.call(() => delay(100).then(() => result.push(2))),
      pool.call(() => delay(500).then(() => result.push(3))),
      pool.call(() => delay(100).then(() => result.push(4))),
    ]);

    expect(result).toEqual([2, 3, 4, 1]);
  });

  it('should retry', async () => {
    const pool = new AsyncTaskPool({ poolSize: 1, retryCount: 1, retryDelay: () => 0 });
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
    const pool = new AsyncTaskPool({ poolSize: 1, retryCount: 1, retryDelay: () => 0 });
    let tries = 0;

    const result = pool.call(() => {
      if (tries === 2) {
        return 'test';
      }
      tries++;
      throw new Error();
    });

    expect(result).rejects.toThrowError();
  });

  it('should throw on retry limit exceeding', async () => {
    const pool = new AsyncTaskPool({ poolSize: 1, retryCount: 1, retryDelay: () => 0 });
    let tries = 0;

    const result = pool.call(() => {
      if (tries === 2) {
        return 'test';
      }
      tries++;
      throw new Error();
    });

    expect(result).rejects.toThrowError();
  });

  it('should correctly calculate retry delay', async () => {
    const spy = jest.fn((retry: number) => retry * 10);
    const pool = new AsyncTaskPool({ poolSize: 1, retryCount: 2, retryDelay: spy });
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
});
