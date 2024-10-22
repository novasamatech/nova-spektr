import { setTimeout } from 'node:timers/promises';

import { createAsyncPipeline } from './createAsyncPipeline';

describe('createAsyncPipeline', () => {
  it('should handle simple case with array concat', async () => {
    const asyncPipeline = createAsyncPipeline<string[]>();

    asyncPipeline.registerHandler({
      fn: (v) => setTimeout(100).then(() => [...v, '1']),
      available: () => true,
    });
    asyncPipeline.registerHandler({
      fn: (v) => [...v, '2'],
      available: () => true,
    });

    const res = await asyncPipeline.apply(['0']);

    expect(res).toEqual(['0', '1', '2']);
  });

  it('should pass meta', async () => {
    const asyncPipeline = createAsyncPipeline<string[], { meta: string }>();

    asyncPipeline.registerHandler({ fn: (v, { meta }) => [...v, `${meta}1`], available: () => true });
    asyncPipeline.registerHandler({ fn: (v, { meta }) => [...v, `${meta}2`], available: () => true });

    const res = await asyncPipeline.apply(['0'], { meta: '0' });

    expect(res).toEqual(['0', '01', '02']);
  });
});
