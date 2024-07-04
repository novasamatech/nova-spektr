type Params<T> = {
  items: T[];
  chunkSize: number;
  task: (item: T, index: number) => Promise<unknown>;
};

const createChunkedTasks = <T>({ items, chunkSize, task }: Params<T>) => {
  const createChunk = (currentIndex: number): Promise<unknown> => {
    const nextIndex = currentIndex + chunkSize;
    const chunkedItems = items.slice(currentIndex, nextIndex);

    if (chunkedItems.length === 0) {
      return Promise.resolve();
    }

    const tasks = chunkedItems.map((item, i) => task(item, currentIndex + i));

    return Promise.allSettled(tasks).finally(() => createChunk(nextIndex));
  };

  return createChunk(0);
};

export const offChainUtils = {
  createChunkedTasks,
};
