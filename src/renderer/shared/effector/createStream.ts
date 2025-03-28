import { default as mitt } from 'mitt';

import { type PromiseWithResolvers, promiseWithResolvers } from '@/shared/lib/utils';

type Status = 'opened' | 'closed' | 'paused';

export type DataStream<T> = AsyncIterable<T> & {
  open(): void;
  close(): void;
  pause(): void;
  resume(): void;
  push(value: T): void;
  fail(error?: Error): void;
  on(status: Status, callback: VoidFunction): VoidFunction;
  pending(): boolean;
};

export function createStream<T>(): DataStream<T> {
  const events = mitt<{ [k in Status]: void }>();

  const resolved: T[] = [];
  let closed = false;
  let pending = false;

  let resolver: PromiseWithResolvers<IteratorResult<T>> | null = null;

  return {
    pending() {
      return pending;
    },
    open() {
      events.emit('opened', undefined);
      pending = true;
    },
    close() {
      events.emit('closed', undefined);
      closed = true;
      if (resolver) {
        resolver.reject(new Error('Stream closed.'));
        resolver = null;
      }
    },
    pause() {
      pending = false;
    },
    resume() {
      pending = true;
    },
    push(value) {
      if (closed) {
        throw new Error('Stream should be opened before push');
      }
      if (!pending) {
        throw new Error('Stream should be resumed before push');
      }

      resolved.push(value);
      if (resolver) {
        resolver.resolve({ value, done: false });
        resolver = null;
      }
    },
    fail(error) {
      if (resolver) {
        resolver.reject(error);
        resolver = null;
      }
    },

    on(reason, callback) {
      events.on(reason, callback);
      return () => events.off(reason, callback);
    },

    [Symbol.asyncIterator]() {
      let index = 0;
      let done = false;

      return {
        next() {
          if (done) {
            return Promise.resolve({
              value: undefined,
              done: true,
            });
          }

          if (index < resolved.length) {
            return Promise.resolve({
              value: resolved.at(index++) as T,
              done: false,
            });
          }

          if (!closed) {
            resolver = promiseWithResolvers();

            return resolver.promise.then(res => {
              index++;

              return res;
            });
          }

          return Promise.resolve({
            value: undefined,
            done: true,
          });
        },
        return() {
          done = true;

          return Promise.resolve({
            value: undefined,
            done: true,
          });
        },
      };
    },
  };
}

export async function* zipStreamWithParams<Params, Result>({
  params,
  result,
}: {
  params: Params;
  result: AsyncIterable<Result>;
}): AsyncIterable<{ params: Params; result: Result }> {
  for await (const r of result) {
    yield { params, result: r };
  }
}
