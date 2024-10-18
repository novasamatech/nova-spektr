import { setTimeout } from 'node:timers/promises';

import { createAsyncPipeline } from './createAsyncPipeline';

describe('createAsyncPipeline', () => {
  it('should handle simple case with array concat', async () => {
    const asyncPipeline = createAsyncPipeline<string[]>();

    asyncPipeline.registerHandler({
      fn: (v) => setTimeout(100).then(() => [...v, '1']),
    });
    asyncPipeline.registerHandler({
      fn: (v) => [...v, '2'],
    });

    const res = await asyncPipeline.apply(['0']);

    expect(res).toEqual(['0', '1', '2']);
  });
});
