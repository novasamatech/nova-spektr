import { allSettled, createEvent, createStore, fork, sample } from 'effector';

import { createResource, createStream } from './createResource';
import { series } from './series';

describe('createResource', () => {
  describe('common cases', () => {
    it('should write data', async () => {
      const scope = fork();
      const chunkReceived = createEvent<number[]>();
      const $store = createStore<number[]>([]);

      const { open } = createResource<void, number[]>({
        create(_, stream) {
          stream.push([1, 2]);
          stream.push([3, 4]);
          stream.close();
        },
      });

      sample({
        clock: open.doneData,
        target: series(chunkReceived),
      });

      sample({
        clock: chunkReceived,
        source: $store,
        fn: (store, chunk) => store.concat(chunk),
        target: $store,
      });

      await allSettled(open, { scope });

      expect(scope.getState($store)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('createStream', () => {
    it('should build up buffer', async () => {
      const iterator = createStream<number>();
      const result: number[] = [];

      iterator.push(1);
      iterator.push(2);
      iterator.push(3);
      iterator.close();

      for await (const item of iterator) {
        result.push(item);
      }

      for await (const item of iterator) {
        result.push(item);
      }

      expect(result).toEqual([1, 2, 3, 1, 2, 3]);
    });

    it('should wait for new values', async () => {
      const iterator = createStream<number>();
      const result: number[] = [];

      iterator.push(1);

      const wait = (async () => {
        for await (const item of iterator) {
          result.push(item);
        }
      })();

      iterator.push(2);
      iterator.close();

      await wait;

      expect(result).toEqual([1, 2]);
    });

    it('should react on break', async () => {
      const iterator = createStream<number>();
      const result: number[] = [];

      iterator.push(1);
      iterator.push(2);
      iterator.close();

      for await (const item of iterator) {
        result.push(item);
        break;
      }

      for await (const item of iterator) {
        result.push(item);
      }

      expect(result).toEqual([1, 1, 2]);
    });
  });
});
