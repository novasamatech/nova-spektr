import { createAbstractIdentifier } from './createAbstractIdentifier';
import { isIdentifier } from './helpers';
import { syncApplyImpl } from './syncApplyImpl';
import { type Identifier } from './types';

// Public interface
type PipelineHandler<Value, Meta> = (value: Value, meta: Meta) => Value;

export type PipelineIdentifier<Value, Meta> = Identifier<Meta, Value, PipelineHandler<Value, Meta>> & {
  apply(value: Value, meta: Meta): Value;
};

const id = <T>(v: T): T => v;
export const isPipelineIdentifier = (v: unknown): v is PipelineIdentifier<any, any> => {
  return isIdentifier(v) && v.type === 'pipeline';
};

export const createPipeline = <Value, Meta = void>(config?: {
  name?: string;
  postprocess?: PipelineHandler<Value, Meta>;
}): PipelineIdentifier<Value, Meta> => {
  const identifier = createAbstractIdentifier<Meta, Value, PipelineHandler<Value, Meta>>({
    type: 'pipeline',
    name: config?.name ?? 'unknownPipeline',
    processHandler: (handler) => ({
      available: handler.available,
      body: ({ acc, input }) => handler.body(acc, input),
    }),
  });

  const postprocess = config?.postprocess ?? id;

  return {
    ...identifier,
    apply(value, meta) {
      return syncApplyImpl({
        identifier,
        input: meta,
        acc: value,
        postprocess: ({ output }) => postprocess(output, meta),
      });
    },
  };
};
