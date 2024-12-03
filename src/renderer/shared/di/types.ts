import { type EventCallable, type Store } from 'effector';

export type HandlerInput<Input, Output> = {
  input: Input;
  acc: Output;
  index: number;
};

export type DefaultHandlerFn<Input, Output> = (handlerInput: HandlerInput<Input, Output>) => Output;

export type Handler<HandlerFn> = {
  available(): boolean;
  body: HandlerFn;
};

export type Identifier<
  Input,
  Output,
  HandlerFn = DefaultHandlerFn<Input, Output>,
  ProcessedHandlerFn = DefaultHandlerFn<Input, Output>,
> = {
  type: string;
  name: string;
  $handlers: Store<Handler<ProcessedHandlerFn>[]>;
  registerHandler: EventCallable<Handler<HandlerFn>>;
  updateHandlers: EventCallable<void>;
  __BRAND: 'Identifier';
};

export type AnyIdentifier<Input = any, Output = any, HandlerFn = any, ProcessedHandlerFn = any> = Identifier<
  Input,
  Output,
  HandlerFn,
  ProcessedHandlerFn
>;

export type InferInput<T extends AnyIdentifier> = T extends AnyIdentifier<infer Input> ? Input : never;
export type InferOutput<T extends AnyIdentifier> = T extends AnyIdentifier<any, infer Output> ? Output : never;
export type InferHandlerFn<T extends AnyIdentifier> = T extends AnyIdentifier<any, any, infer Fn> ? Fn : never;
