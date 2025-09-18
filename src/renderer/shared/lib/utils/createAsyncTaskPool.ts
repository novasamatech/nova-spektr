import { isNumber } from 'lodash';

import { groupBy } from './arrays';
import { nullable, promiseWithResolvers } from './functions';

const DEFAULT_POOL = 'default';

type Params = {
  poolSize: number;
  retryCount: number;
  retryDelay: ((attempt: number) => number) | number;
};

type Task<T = unknown> = {
  fn: () => T | Promise<T>;
  pool: string;
  retry: number;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

type TaskParams = { pool?: string };

/**
 * Task manager with queues, retries and named pools.
 */
class AsyncTaskPool {
  private awaiters: VoidFunction[] = [];
  private queue: Task[] = [];
  private activeTasks: Task[] = [];

  constructor(private readonly config: Params) {}

  call<T>(fn: () => T | Promise<T>, params?: TaskParams) {
    const { resolve, reject, promise } = promiseWithResolvers<T>();
    const task: Task<T> = {
      fn,
      pool: params?.pool ?? DEFAULT_POOL,
      retry: 0,
      resolve,
      reject,
    };

    this.queue.push(task as Task);
    this.processQueue();

    return promise;
  }

  settle() {
    if (this.queue.length === 0 && this.activeTasks.length === 0) {
      return Promise.resolve();
    }

    const { resolve, promise } = promiseWithResolvers<void>();
    this.awaiters.push(resolve);
    return promise;
  }

  private async processQueue() {
    let task: Task | null = null;
    // finding next task with free pool
    const pools = groupBy(this.activeTasks, (t) => t.pool);
    for (const [index, potencialTask] of this.queue.entries()) {
      const pool = pools[potencialTask.pool] ?? [];
      if (nullable(pool) || pool.length < this.config.poolSize) {
        task = potencialTask;
        this.queue.splice(index, 1);
        break;
      }
    }

    if (!task) {
      this.finishPool();
      return;
    }
    this.activeTasks.push(task);

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      if (task.retry >= this.config.retryCount) {
        task.reject(error);
      } else {
        const retryDelay = isNumber(this.config.retryDelay)
          ? this.config.retryDelay
          : this.config.retryDelay(task.retry);

        setTimeout(() => {
          this.queue.push(task);
          this.processQueue();
        }, retryDelay);
        task.retry++;
      }
    } finally {
      this.activeTasks = this.activeTasks.filter((x) => x !== task);
      this.processQueue();
    }
  }

  private finishPool() {
    if (this.activeTasks.length > 0 || this.queue.length > 0) return;
    for (const awaiter of this.awaiters) {
      awaiter();
    }
    this.awaiters.length = 0;
  }
}

export const createAsyncTaskPool = (params: Params) => new AsyncTaskPool(params);
