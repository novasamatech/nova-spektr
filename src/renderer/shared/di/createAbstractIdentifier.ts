import { createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type DefaultHandlerFn, type Handler, type Identifier, type RegisterHandlerParams } from './types';

type Params<Input, Output, HandlerFn> = {
  type: string;
  name: string;
  processHandler(handler: RegisterHandlerParams<HandlerFn>): RegisterHandlerParams<DefaultHandlerFn<Input, Output>>;
};

export const createAbstractIdentifier = <Input, Output, HandlerFn = DefaultHandlerFn<Input, Output>>({
  type,
  name,
  processHandler,
}: Params<Input, Output, HandlerFn>) => {
  type ResultIdentifier = Identifier<Input, Output, HandlerFn>;
  type HandlerRecord = Handler<Input, Output>;

  const $handlers = createStore<HandlerRecord[]>([]);
  const registerHandler = createEvent<HandlerRecord>();
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
  };

  return identifier;
};
