import { createPipeline } from './createPipeline';

describe('createPipeline', () => {
  it('should handle simple case with array concat', () => {
    const pipeline = createPipeline<string[]>();

    pipeline.registerHandler({ fn: (v) => [...v, '1'] });
    pipeline.registerHandler({ fn: (v) => [...v, '2'] });

    const res = pipeline.apply(['0']);

    expect(res).toEqual(['0', '1', '2']);
  });
});
