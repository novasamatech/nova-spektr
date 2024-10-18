import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';

type AsyncPipelineHandler<Value> = (value: Value) => Promise<Value>;

export const createAsyncPipeline = <Value>(config?: { name: string }) => {
  const identifier = createAbstractIdentifier<void, Promise<Value>, AsyncPipelineHandler<Value>>({
    name: config?.name ?? 'unknownPipeline',
    processHandler(params) {
      return {
        fn: ({ acc }) => acc.then(params.fn),
      };
    },
  });

  return {
    ...identifier,
    apply: (value: Value) => syncApplyImpl({ identifier, input: undefined, acc: Promise.resolve(value) }),
  };
};
