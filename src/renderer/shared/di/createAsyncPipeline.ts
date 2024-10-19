import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';

// Public interface
type AsyncPipelineHandler<Value> = (value: Value) => Value | Promise<Value>;

export const createAsyncPipeline = <Value>(config?: { name: string }) => {
  const identifier = createAbstractIdentifier<void, Promise<Value>, AsyncPipelineHandler<Value>>({
    name: config?.name ?? 'unknownPipeline',
    processHandler: (handler) => ({
      fn: ({ acc }) => acc.then(handler.fn),
    }),
  });

  return {
    ...identifier,
    apply: (value: Value) => syncApplyImpl({ identifier, input: undefined, acc: Promise.resolve(value) }),
  };
};
