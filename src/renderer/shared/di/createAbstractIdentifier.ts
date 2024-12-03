import { createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type DefaultHandlerFn, type Handler, type Identifier } from './types';

type Params<HandlerFn, ProcessedHandlerFn> = {
  type: string;
  name: string;
  processHandler(handler: Handler<HandlerFn>): Handler<ProcessedHandlerFn>;
};

export const createAbstractIdentifier = <
  Input,
  Output,
  HandlerFn = DefaultHandlerFn<Input, Output>,
  ProcessedHandlerFn = DefaultHandlerFn<Input, Output>,
>({
  type,
  name,
  processHandler,
}: Params<HandlerFn, ProcessedHandlerFn>) => {
  type ResultIdentifier = Identifier<Input, Output, HandlerFn, ProcessedHandlerFn>;

  const $handlers = createStore<Handler<ProcessedHandlerFn>[]>([]);
  const registerHandler = createEvent<Handler<ProcessedHandlerFn>>();
  const forceUpdate = createEvent();

  sample({
    clock: registerHandler,
    source: $handlers,
    fn: (handlers, handler) => handlers.concat(handler),
    target: $handlers,
  });

  const identifier: ResultIdentifier = {
    type,
    name,
    $handlers: readonly($handlers),
    registerHandler: registerHandler.prepend(processHandler),
    updateHandlers: forceUpdate,
    __BRAND: 'Identifier',
  };

  return identifier;
};
