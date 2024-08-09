import { createQueuedRequest } from '../createQueuedRequest';

type ExampleData = { item: number };
type ExampleResponse = { total: number; data: ExampleData[] };

describe('createQueuedRequest', () => {
  it('should make correct number of requests', async () => {
    const total = 10;

    const request = jest
      .fn<Promise<ExampleResponse>, [index: number]>()
      .mockImplementation((index) => Promise.resolve({ total, data: [{ item: index }] }));

    const result = await createQueuedRequest({
      makeRequest: request,
      getRecords: (r) => r.data,
      getTotalRequests: (r) => r.total,
    });

    expect(request).toBeCalledTimes(10);
    expect(result).toEqual(Array.from({ length: 10 }).map((_, index) => ({ item: index })));
  });
});
