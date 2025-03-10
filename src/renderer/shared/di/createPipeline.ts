import { createAbstractIdentifier } from './createAbstractIdentifier';
import { isIdentifier } from './helpers';
import { syncApplyImpl } from './syncApplyImpl';
import { type Identifier } from './types';

// Public interface
type PipelineHandler<Value, Meta> = (value: Value, meta: Meta) => Value;

export type PipelineIdentifier<Value, Meta> = Identifier<Meta, Value, PipelineHandler<Value, Meta>> &
  ((value: Value, meta: Meta) => Value);

const id = <T>(v: T): T => v;
export const isPipelineIdentifier = (v: unknown): v is PipelineIdentifier<any, any> => {
  return isIdentifier(v) && v.type === 'pipeline';
};

/**
 * Create a pipeline DI function. The pipeline acts like a list of data
 * transformers; it gets a value from the previous pipeline function and passes
 * it to the next one. Behavior is similar to this code:
 *
 * ```ts
 * functions.reduce((fn, data) => fn(data), input);
 * ```
 */
export const createPipeline = <Value, Meta = void>(config?: {
  name?: string;
  postprocess?: PipelineHandler<Value, Meta>;
}): PipelineIdentifier<Value, Meta> => {
  const identifier = createAbstractIdentifier<Meta, Value, PipelineHandler<Value, Meta>>({
    type: 'pipeline',
    name: config?.name ?? 'unknownPipeline',
    processHandler: handler => ({
      key: handler.key,
      available: handler.available,
      body: ({ acc, input }) => handler.body(acc, input),
    }),
  });

  const postprocess = config?.postprocess ?? id;

  const applyFunction = (value: Value, meta: Meta) => {
    return syncApplyImpl({
      identifier,
      input: meta,
      acc: value,
      postprocess: ({ output }) => postprocess(output, meta),
    });
  };

  return Object.assign(applyFunction, identifier);
};
