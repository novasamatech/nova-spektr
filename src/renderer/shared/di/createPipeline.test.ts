import { createPipeline } from './createPipeline';

describe('createPipeline', () => {
  it('should handle simple case with array concat', () => {
    const pipeline = createPipeline<string[]>();

    pipeline.registerHandler({ fn: (v) => [...v, '1'] });
    pipeline.registerHandler({ fn: (v) => [...v, '2'] });

    const res = pipeline.apply(['0']);

    expect(res).toEqual(['0', '1', '2']);
  });

  it('should pass meta', () => {
    const pipeline = createPipeline<string[], { meta: string }>();

    pipeline.registerHandler({ fn: (v, { meta }) => [...v, `${meta}1`] });
    pipeline.registerHandler({ fn: (v, { meta }) => [...v, `${meta}2`] });

    const res = pipeline.apply(['0'], { meta: '0' });

    expect(res).toEqual(['0', '01', '02']);
  });

  it('should postprocess', () => {
    const pipeline = createPipeline<string[]>({
      postprocess: (v) => v.reverse(),
    });

    pipeline.registerHandler({ fn: (v) => [...v, '1'] });
    pipeline.registerHandler({ fn: (v) => [...v, '2'] });

    const res = pipeline.apply(['0']);

    expect(res).toEqual(['2', '1', '0']);
  });
});
