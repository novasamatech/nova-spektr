import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';

type PipelineHandler<Value> = (value: Value) => Value;

export const createPipeline = <Value>(config?: { name: string }) => {
  const identifier = createAbstractIdentifier<void, Value, PipelineHandler<Value>>({
    name: config?.name ?? 'unknownPipeline',
    processHandler(params) {
      return {
        fn: ({ acc }) => params.fn(acc),
      };
    },
  });

  return {
    ...identifier,
    apply: (value: Value) => syncApplyImpl({ identifier, input: undefined, acc: value }),
  };
};
