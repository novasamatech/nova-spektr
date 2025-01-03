import { createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type DefaultHandlerBody, type Handler, type Identifier } from './types';

type Params<HandlerBody, ProcessedHandlerBody> = {
  type: string;
  name: string;
  processHandler(handler: Handler<HandlerBody>): Handler<ProcessedHandlerBody>;
};

export const createAbstractIdentifier = <
  Input,
  Output,
  HandlerBody = DefaultHandlerBody<Input, Output>,
  ProcessedHandlerBody = DefaultHandlerBody<Input, Output>,
>({
  type,
  name,
  processHandler,
}: Params<HandlerBody, ProcessedHandlerBody>) => {
  type ResultIdentifier = Identifier<Input, Output, HandlerBody, ProcessedHandlerBody>;

  const $handlers = createStore<Handler<ProcessedHandlerBody>[]>([]);
  const resetHandlers = createEvent<void>();
  const registerHandler = createEvent<Handler<ProcessedHandlerBody>>();
  const forceUpdate = createEvent();

  sample({
    clock: registerHandler,
    source: $handlers,
    fn: (handlers, handler) => handlers.concat(handler),
    target: $handlers,
  });

  sample({
    clock: resetHandlers,
    fn: () => [],
    target: $handlers,
  });

  const identifier: ResultIdentifier = {
    type,
    name,
    $handlers: readonly($handlers),
    resetHandlers,
    registerHandler: registerHandler.prepend(processHandler),
    updateHandlers: forceUpdate,
    __BRAND: 'Identifier',
  };

  return identifier;
};
