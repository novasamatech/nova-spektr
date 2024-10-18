import { setTimeout } from 'node:timers/promises';

import { createAsyncPipeline } from './createAsyncPipeline';

describe('createAsyncPipeline', () => {
  it('should handle simple case with array concat', async () => {
    const pipeline = createAsyncPipeline<string[]>();

    pipeline.registerHandler({
      fn: (v) => setTimeout(100).then(() => [...v, '1']),
    });
    pipeline.registerHandler({
      fn: (v) => [...v, '2'],
    });

    const res = await pipeline.apply(['0']);

    expect(res).toEqual(['0', '1', '2']);
  });
});
