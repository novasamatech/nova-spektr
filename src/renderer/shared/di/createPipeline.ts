import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';

// Public interface
type PipelineHandler<Value> = (value: Value) => Value;

export const createPipeline = <Value>(config?: { name: string }) => {
  const identifier = createAbstractIdentifier<void, Value, PipelineHandler<Value>>({
    name: config?.name ?? 'unknownPipeline',
    processHandler: (handler) => ({
      fn: ({ acc }) => handler.fn(acc),
    }),
  });

  return {
    ...identifier,
    apply: (value: Value) => syncApplyImpl({ identifier, input: undefined, acc: value }),
  };
};
