import { createEffect } from 'effector';

import { type PromiseWithResolvers, promiseWithResolvers } from '@/shared/lib/utils';

export type DataStream<T> = AsyncIterable<T> & {
  push(value: T): void;
  close(): void;
  fail(error?: Error): void;
  abort(): void;
  aborted(): boolean;
  response(): Promise<T>;
  on(reason: 'abort', callback: () => void): void;
};

export function createStream<T>(): DataStream<T> {
  const resolved: T[] = [];
  let closed = false;
  const abortController = new AbortController();

  let resolver: PromiseWithResolvers<IteratorResult<T>> | null = null;

  return {
    push(value) {
      if (closed) return;

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
    close() {
      closed = true;
      if (resolver) {
        resolver.reject(new Error('Stream closed.'));
        resolver = null;
      }
    },

    abort() {
      abortController.abort();
    },
    on(reason, callback) {
      switch (reason) {
        case 'abort':
          abortController.signal.addEventListener('abort', callback, { once: true });
          break;
        default:
          throw new Error(`Event type ${reason} is not supported.`);
      }
    },
    aborted() {
      return abortController.signal.aborted;
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

type Config<Params, Value> = {
  create(params: Params, stream: DataStream<Value>): unknown;
};

export function createResource<Params, Value>({ create }: Config<Params, Value>) {
  return {
    open: createEffect((params: Params) => {
      const stream = createStream<Value>();
      create(params, stream);

      return stream;
    }),
    close: createEffect((stream: DataStream<Value>) => {
      stream.abort();
    }),
  };
}
