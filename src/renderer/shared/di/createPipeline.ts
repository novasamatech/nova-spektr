import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';

// Public interface
type PipelineHandler<Value, Meta> = (value: Value, meta: Meta) => Value;

export const createPipeline = <Value, Meta = void>(config?: {
  name?: string;
  postprocess?: PipelineHandler<Value, Meta>;
}) => {
  const identifier = createAbstractIdentifier<Meta, Value, PipelineHandler<Value, Meta>>({
    name: config?.name ?? 'unknownPipeline',
    processHandler: (handler) => ({
      fn: ({ acc, input }) => handler.fn(acc, input),
    }),
  });

  return {
    ...identifier,
    apply(value: Value, meta: Meta) {
      const res = syncApplyImpl({ identifier, input: meta, acc: value });
      if (config?.postprocess) {
        return config.postprocess(res, meta);
      } else {
        return res;
      }
    },
  };
};
