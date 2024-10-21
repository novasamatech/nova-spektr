import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';

// Public interface
type AsyncPipelineHandler<Value, Meta> = (value: Value, meta: Meta) => Value | Promise<Value>;

export const createAsyncPipeline = <Value, Meta = void>(config?: {
  name?: string;
  postprocess?: AsyncPipelineHandler<Value, Meta>;
}) => {
  const identifier = createAbstractIdentifier<Meta, Promise<Value>, AsyncPipelineHandler<Value, Meta>>({
    name: config?.name ?? 'unknownAsyncPipeline',
    processHandler: (handler) => ({
      fn: ({ acc, input }) => acc.then((value) => handler.fn(value, input)),
    }),
  });

  return {
    ...identifier,
    apply(value: Value, meta: Meta) {
      return syncApplyImpl({ identifier, input: meta, acc: Promise.resolve(value) }).then((v) => {
        if (config?.postprocess) {
          return config.postprocess(v, meta);
        } else {
          return v;
        }
      });
    },
  };
};
