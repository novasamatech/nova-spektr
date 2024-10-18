import { createEvent, createStore, sample } from 'effector';

import {
  type DefaultHandlerFn,
  type Handler,
  type Identifier,
  type InferInput,
  type InferOutput,
  type RegisterHandlerParams,
} from './types';

type Params<Input, Output, HandlerFn> = {
  name: string;
  processHandler(params: RegisterHandlerParams<HandlerFn>): RegisterHandlerParams<DefaultHandlerFn<Input, Output>>;
};

export const createAbstractIdentifier = <Input, Output, HandlerFn>({
  name,
  processHandler,
}: Params<Input, Output, HandlerFn>) => {
  type ResultIdentifier = Identifier<Input, Output, HandlerFn>;
  type HandlerRecord = Handler<InferInput<ResultIdentifier>, InferOutput<ResultIdentifier>>;

  const $handlers = createStore<HandlerRecord[]>([]);
  const registerHandler = createEvent<HandlerRecord>();
  const forceUpdate = createEvent();

  sample({
    clock: forceUpdate,
    source: $handlers,
    fn: (handlers) => [...handlers],
    target: $handlers,
  });

  sample({
    clock: registerHandler,
    source: $handlers,
    fn: (handlers, handler) => handlers.concat(handler),
    target: $handlers,
  });

  const identifier: ResultIdentifier = {
    name,
    $handlers,
    registerHandler: (handler) => registerHandler(processHandler(handler)),
    handlersChanged: forceUpdate,
  };

  return identifier;
};