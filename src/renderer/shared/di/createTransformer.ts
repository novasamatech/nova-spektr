import { nonNullable } from '@/shared/lib/utils';

import { createAbstractIdentifier } from './createAbstractIdentifier';
import { isIdentifier } from './helpers';
import { type Identifier } from './types';

// Public interface
type TransformerHandler<Value, Result, Meta> = (value: Value, meta: Meta) => Result | null | undefined;

export type TransformerIdentifier<Value, Result, Meta> = Identifier<
  Meta,
  Value,
  TransformerHandler<Value, Result, Meta>,
  TransformerHandler<Value, Result, Meta>
> &
  ((value: Value, meta: Meta) => Result | null);

const id = <T>(v: T): T => v;
export const isTransformerIdentifier = (v: unknown): v is TransformerIdentifier<any, any, any> => {
  return isIdentifier(v) && v.type === 'Transformer';
};

export const createTransformer = <Value, Result, Meta = void>(config?: {
  name?: string;
  postprocess?(result: Result): Result;
}): TransformerIdentifier<Value, Result, Meta> => {
  const identifier = createAbstractIdentifier<
    Meta,
    Value,
    TransformerHandler<Value, Result, Meta>,
    TransformerHandler<Value, Result, Meta>
  >({
    type: 'Transformer',
    name: config?.name ?? 'unknownTransformer',
    processHandler: handler => ({
      key: handler.key,
      available: handler.available,
      body: (value, meta) => handler.body(value, meta),
    }),
  });

  const postprocess = config?.postprocess ?? id;

  const applyFunction = (value: Value, meta: Meta): Result | null => {
    // eslint-disable-next-line effector/no-getState
    const handlers = identifier.$handlers.getState();

    for (let index = 0; index < handlers.length; index++) {
      const handler = handlers[index];
      if (!handler) continue;

      try {
        if (handler.available()) {
          const fnResult = handler.body(value, meta);
          if (nonNullable(fnResult)) {
            return postprocess(fnResult);
          }
        }
      } catch (error) {
        // TODO handle error
        console.error(error);

        // Skip handler and move on
        continue;
      }
    }

    return null;
  };

  return Object.assign(applyFunction, identifier);
};
