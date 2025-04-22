import { createStream } from './createStream';

describe('createStream', () => {
  it('should build up buffer', async () => {
    const iterator = createStream<number>();
    const result: number[] = [];

    iterator.open();
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

    iterator.open();
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

    iterator.open();
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
