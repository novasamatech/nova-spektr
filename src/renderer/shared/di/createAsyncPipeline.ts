import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';

// Public interface
type AsyncPipelineHandler<Value, Meta> = (value: Value, meta: Meta) => Value | Promise<Value>;

const id = <T>(v: T): T => v;

export const createAsyncPipeline = <Value, Meta = void>(config?: {
  name?: string;
  postprocess?: AsyncPipelineHandler<Value, Meta>;
}) => {
  const identifier = createAbstractIdentifier<Meta, Promise<Value>, AsyncPipelineHandler<Value, Meta>>({
    type: 'asyncPipeline',
    name: config?.name ?? 'unknownAsyncPipeline',
    processHandler: (handler) => ({
      available: handler.available,
      body: ({ acc, input }) => acc.then((value) => handler.body(value, input)),
    }),
  });

  const postprocess = config?.postprocess ?? id;

  return {
    ...identifier,
    apply(value: Value, meta: Meta) {
      return syncApplyImpl({
        identifier,
        input: meta,
        acc: Promise.resolve(value),
        postprocess: ({ output }) => output.then((v) => postprocess(v, meta) as Awaited<Value>),
      });
    },
  };
};
