import { createChunkedRequest } from '../lib/createChunkedRequest';

type ExampleData = { item: number };
type ExampleResponse = { total: number; data: ExampleData[] };

describe('createChunkedRequest', () => {
  it('should make correct number of requests', async () => {
    const total = 10;

    const request = jest
      .fn<Promise<ExampleResponse>, [index: number]>()
      .mockImplementation((index) => Promise.resolve({ total, data: [{ item: index }] }));

    const result = await createChunkedRequest({
      makeRequest: request,
      chunkSize: 5,
      getRecords: (r) => r.data,
      getTotalRequests: (r) => r.total / 2,
    });

    expect(request).toBeCalledTimes(5);
    expect(result).toEqual(Array.from({ length: 5 }).map((_, index) => ({ item: index })));
  });
});
