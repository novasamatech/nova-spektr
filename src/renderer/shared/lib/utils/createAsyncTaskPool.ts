import { isNumber } from 'lodash';

import { groupBy } from './arrays';
import { nullable } from './functions';

const DEFAULT_POOL = 'default';

type Params = {
  poolSize: number;
  retryCount: number;
  retryDelay: ((attempt: number) => number) | number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Task<T = unknown> = {
  fn: () => T | Promise<T>;
  pool: string;
  retry: number;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (error: unknown) => void;
};

type TaskParams = { pool?: string };

/**
 * Task manager with queues, retries and named pools.
 */
class AsyncTaskPool {
  private queue: Task[] = [];
  private activeTasks: Task[] = [];

  constructor(private readonly config: Params) {}

  call<T>(fn: () => T | Promise<T>, params?: TaskParams) {
    let externalResolve: ((value: T | PromiseLike<T>) => void) | null = null;
    let externalReject: ((error: unknown) => void) | null = null;
    const promise = new Promise<T>((resolve, reject) => {
      externalResolve = resolve;
      externalReject = reject;
    });

    if (!externalResolve || !externalReject) {
      throw new Error("Can't create resolvable promise");
    }

    const task: Task = {
      fn,
      pool: params?.pool ?? DEFAULT_POOL,
      retry: 0,
      resolve: externalResolve,
      reject: externalReject,
    };

    this.queue.push(task);
    this.processQueue();

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

    if (!task) return;
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
}

export const createAsyncTaskPool = (params: Params) => new AsyncTaskPool(params);
