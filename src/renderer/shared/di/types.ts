import { type EventCallable, type Store } from 'effector';

export type HandlerInput<Input, Output> = {
  input: Input;
  acc: Output;
  index: number;
};

export type DefaultHandlerFn<Input, Output> = (handlerInput: HandlerInput<Input, Output>) => Output;

export type RegisterHandlerParams<HandlerFn> = {
  fn: HandlerFn;
};

export type Handler<Input, Output> = {
  fn: DefaultHandlerFn<Input, Output>;
};

export type Identifier<Input, Output, HandlerFn = DefaultHandlerFn<Input, Output>> = {
  name: string;
  $handlers: Store<Handler<Input, Output>[]>;
  registerHandler(params: RegisterHandlerParams<HandlerFn>): void;
  updateHandlers: EventCallable<void>;
};

export type AnyIdentifier<Input = any, Output = any, HandlerFn = any> = Identifier<Input, Output, HandlerFn>;

export type InferInput<T extends AnyIdentifier> = T extends AnyIdentifier<infer Input> ? Input : never;
export type InferOutput<T extends AnyIdentifier> = T extends AnyIdentifier<any, infer Output> ? Output : never;
export type InferHandlerFn<T extends AnyIdentifier> = T extends AnyIdentifier<any, any, infer Fn> ? Fn : never;
