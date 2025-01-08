import { type EventCallable, type Store } from 'effector';

export type HandlerInput<Input, Output> = {
  input: Input;
  acc: Output;
  index: number;
};

export type DefaultHandlerBody<Input, Output> = (handlerInput: HandlerInput<Input, Output>) => Output;

export type Handler<HandlerBody> = {
  /**
   * Optional key, can be used as identifier for deduplication.
   */
  key?: string;
  available(): boolean;
  body: HandlerBody;
};

export type Identifier<
  Input,
  Output,
  HandlerBody = DefaultHandlerBody<Input, Output>,
  ProcessedHandlerBody = DefaultHandlerBody<Input, Output>,
> = {
  type: string;
  name: string;
  $handlers: Store<Handler<ProcessedHandlerBody>[]>;
  registerHandler: EventCallable<Handler<HandlerBody>>;
  updateHandlers: EventCallable<void>;
  resetHandlers: EventCallable<void>;
  __BRAND: 'Identifier';
};

export type AnyIdentifier<Input = any, Output = any, HandlerBody = any, ProcessedHandlerBody = any> = Identifier<
  Input,
  Output,
  HandlerBody,
  ProcessedHandlerBody
>;

export type InferInput<T extends AnyIdentifier> = T extends AnyIdentifier<infer Input> ? Input : never;
export type InferOutput<T extends AnyIdentifier> = T extends AnyIdentifier<any, infer Output> ? Output : never;
export type InferHandlerBody<T extends AnyIdentifier> = T extends AnyIdentifier<any, any, infer Fn> ? Fn : never;
export type InferProcessedHandlerBody<T extends AnyIdentifier> =
  T extends AnyIdentifier<any, any, any, infer Fn> ? Fn : never;
