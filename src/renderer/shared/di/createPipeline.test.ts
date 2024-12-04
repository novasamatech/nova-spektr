import { createPipeline, isPipelineIdentifier } from './createPipeline';

describe('createPipeline', () => {
  it('should check type', () => {
    expect(isPipelineIdentifier(createPipeline())).toBeTruthy();
    expect(isPipelineIdentifier({})).toBeFalsy();
  });

  it('should handle simple case with array concat', () => {
    const pipeline = createPipeline<string[]>();

    pipeline.registerHandler({ body: (v) => [...v, '1'], available: () => true });
    pipeline.registerHandler({ body: (v) => [...v, '2'], available: () => true });

    const res = pipeline.apply(['0']);

    expect(res).toEqual(['0', '1', '2']);
  });

  it('should pass meta', () => {
    const pipeline = createPipeline<string[], { meta: string }>();

    pipeline.registerHandler({ body: (v, { meta }) => [...v, `${meta}1`], available: () => true });
    pipeline.registerHandler({ body: (v, { meta }) => [...v, `${meta}2`], available: () => true });

    const res = pipeline.apply(['0'], { meta: '0' });

    expect(res).toEqual(['0', '01', '02']);
  });

  it('should postprocess', () => {
    const pipeline = createPipeline<string[]>({
      postprocess: (v) => v.reverse(),
    });

    pipeline.registerHandler({ body: (v) => [...v, '1'], available: () => true });
    pipeline.registerHandler({ body: (v) => [...v, '2'], available: () => true });

    const res = pipeline.apply(['0']);

    expect(res).toEqual(['2', '1', '0']);
  });
});
