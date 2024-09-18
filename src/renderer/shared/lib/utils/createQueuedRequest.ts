type Params = {
  task: (index: number) => Promise<unknown>;
  totalTasks: number;
};

export const createQueuedTasks = ({ totalTasks, task }: Params) => {
  const createTask = (currentIndex: number): Promise<unknown> => {
    if (currentIndex === totalTasks) {
      return Promise.resolve();
    }

    return task(currentIndex).finally(() => createTask(currentIndex + 1));
  };

  return createTask(0);
};

type queueRequestParams<T, V> = {
  makeRequest: (chunkIndex: number) => Promise<T>;
  getRecords: (value: T) => V[];
  getTotalRequests: (value: T) => number;
  callback?: (records: V[], done: boolean) => unknown;
};

export const createQueuedRequest = async <T, V>({
  makeRequest,
  getTotalRequests,
  getRecords,
  callback,
}: queueRequestParams<T, V>): Promise<V[]> => {
  const ping = await makeRequest(0);
  const totalRequests = getTotalRequests(ping);

  let result = getRecords(ping);

  callback?.(result, totalRequests <= 1);

  return createQueuedTasks({
    totalTasks: Math.max(totalRequests - 1, 0),
    task: (index) => {
      return makeRequest(index + 1).then((data) => {
        const records = getRecords(data);
        result = result.concat(records);
        callback?.(records, index === totalRequests - 1);
      });
    },
  }).then(() => result);
};
