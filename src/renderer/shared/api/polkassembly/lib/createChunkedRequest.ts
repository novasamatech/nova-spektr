type Params<T> = {
  items: T[];
  chunkSize: number;
  task: (item: T, index: number) => Promise<unknown>;
};

export const createChunkedTasks = <T>({ items, chunkSize, task }: Params<T>) => {
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

type ChunkedRequestParams<T, V> = {
  makeRequest: (chunkIndex: number) => Promise<T>;
  getRecords: (value: T) => V[];
  getTotalRequests: (value: T) => number;
  chunkSize: number;
  callback?: (records: V[], done: boolean) => unknown;
};

export const createChunkedRequest = async <T, V>({
  makeRequest,
  getTotalRequests,
  getRecords,
  chunkSize,
  callback,
}: ChunkedRequestParams<T, V>): Promise<V[]> => {
  const ping = await makeRequest(0);
  const totalRequests = getTotalRequests(ping);

  let result = getRecords(ping);

  return createChunkedTasks({
    items: Array.from({ length: totalRequests - 1 }),
    chunkSize,
    task: (_, index) => {
      return makeRequest(index + 1).then((data) => {
        const records = getRecords(data);
        result = result.concat(records);
        callback?.(records, index === totalRequests - 1);
      });
    },
  }).then(() => result);
};
