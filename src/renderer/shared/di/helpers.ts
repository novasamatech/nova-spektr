import { combine, createEvent, sample } from 'effector';
import { uniq } from 'lodash';

import { type AnyIdentifier, type Handler } from './types';

export const isIdentifier = (v: unknown): v is AnyIdentifier => {
  return typeof v === 'object' && v !== null && '__BRAND' in v && v.__BRAND === 'Identifier';
};

export const combineIdentifiers = <HandlerBody>(
  ...identifiers: AnyIdentifier<unknown, unknown, HandlerBody>[]
): AnyIdentifier<unknown, unknown, HandlerBody> => {
  const types = uniq(identifiers.map((identifier) => identifier.type));
  const names = uniq(identifiers.map((identifier) => identifier.name));
  const registerHandler = createEvent<Handler<HandlerBody>>();
  const updateHandlers = createEvent();
  const resetHandlers = createEvent();
  const $handlers = combine(
    identifiers.map((identifier) => identifier.$handlers),
    (handlers) => handlers.flat(),
  );

  sample({
    clock: registerHandler,
    target: identifiers.map((identifier) => identifier.registerHandler),
  });
  sample({
    clock: updateHandlers,
    target: identifiers.map((identifier) => identifier.updateHandlers),
  });
  sample({
    clock: resetHandlers,
    target: identifiers.map((identifier) => identifier.resetHandlers),
  });

  return {
    type: types.at(0) ?? 'unknownType',
    name: `combined(${names.join(', ')})`,
    $handlers,
    registerHandler,
    updateHandlers,
    resetHandlers,
    __BRAND: 'Identifier',
  };
};
