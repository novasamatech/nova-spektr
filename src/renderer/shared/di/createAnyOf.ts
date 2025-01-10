import { createAbstractIdentifier } from './createAbstractIdentifier';
import { isIdentifier } from './helpers';
import { syncApplyImpl } from './syncApplyImpl';
import { type Identifier } from './types';

// Public interface
type AnyOfHandler<Value> = (value: Value) => boolean | void;

export type AnyOfIdentifier<Value> = Identifier<Value, boolean, AnyOfHandler<Value>> & {
  check(value: Value): boolean;
};

export const isAnyOfIdentifier = (v: unknown): v is AnyOfIdentifier<any> => {
  return isIdentifier(v) && v.type === 'anyOf';
};

export const createAnyOf = <Value>(config?: { name?: string }): AnyOfIdentifier<Value> => {
  const identifier = createAbstractIdentifier<Value, boolean, AnyOfHandler<Value>>({
    type: 'anyOf',
    name: config?.name ?? 'unknownAnyOf',
    processHandler: (handler) => ({
      key: handler.key,
      available: handler.available,
      body: ({ acc, input }) => (acc || handler.body(input)) ?? acc,
    }),
  });

  return {
    ...identifier,
    check(value) {
      return syncApplyImpl({
        identifier,
        input: value,
        acc: false,
      });
    },
  };
};
