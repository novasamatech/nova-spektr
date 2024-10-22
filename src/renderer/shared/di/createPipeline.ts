import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';
import { type Identifier } from './types';

// Public interface
type PipelineHandler<Value, Meta> = (value: Value, meta: Meta) => Value;

export type PipelineIdentifier<Value, Meta> = Identifier<Meta, Value, PipelineHandler<Value, Meta>> & {
  apply(value: Value, meta: Meta): Value;
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
      fn: ({ acc, input }) => handler.fn(acc, input),
    }),
  });

  return {
    ...identifier,
    apply(value, meta) {
      const res = syncApplyImpl({ identifier, input: meta, acc: value });
      if (config?.postprocess) {
        return config.postprocess(res, meta);
      } else {
        return res;
      }
    },
  };
};
