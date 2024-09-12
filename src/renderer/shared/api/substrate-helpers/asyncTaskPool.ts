type Params = {
  poolSize: number;
  retryCount: number;
  retryDelay: (attempt: number) => number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Task<T = any> = {
  fn: () => T | Promise<T>;
  retry: number;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (error: unknown) => void;
};

export class AsyncTaskPool {
  private queue: Task[] = [];
  private activeTasks: Task[] = [];

  constructor(private readonly config: Params) {}

  call<T>(fn: () => T | Promise<T>) {
    let externalResolve: ((value: T | PromiseLike<T>) => void) | null = null;
    let externalReject: ((error: unknown) => void) | null = null;
    const promise = new Promise<T>((resolve, reject) => {
      externalResolve = resolve;
      externalReject = reject;
    });

    if (!externalResolve || !externalReject) {
      throw new Error("Can't create resolvable promise");
    }

    const task: Task<T> = {
      fn,
      retry: 0,
      resolve: externalResolve,
      reject: externalReject,
    };

    this.queue.push(task);
    this.processQueue();

    return promise;
  }

  private async processQueue() {
    if (this.activeTasks.length >= this.config.poolSize) {
      return;
    }

    const task = this.queue.shift();
    if (!task) {
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
        setTimeout(() => {
          this.queue.push(task);
          this.processQueue();
        }, this.config.retryDelay(task.retry));
        task.retry++;
      }
    } finally {
      this.activeTasks = this.activeTasks.filter((x) => x !== task);
      this.processQueue();
    }
  }
}