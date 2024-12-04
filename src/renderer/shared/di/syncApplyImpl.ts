import { skipAction } from './constants';
import { type AnyIdentifier, type DefaultHandlerBody, type Handler } from './types';

type PostprocessParams<Input, Output> = {
  input: Input;
  output: Output;
  handlers: Handler<DefaultHandlerBody<Input, Output>>[];
};

type Params<Input, Output> = {
  identifier: AnyIdentifier<Input, Output>;
  acc: Output;
  input: Input;
  postprocess?(params: PostprocessParams<Input, Output>): Output;
};

export const syncApplyImpl = <Input, Output>({
  identifier,
  acc,
  input,
  postprocess,
}: Params<Input, Output>): Output => {
  // eslint-disable-next-line effector/no-getState
  const handlers = identifier.$handlers.getState();
  let result = acc;

  for (let index = 0; index < handlers.length; index++) {
    const handler = handlers[index];
    if (!handler) continue;

    try {
      if (handler.available()) {
        const value = handler.body({ acc: result, input, index });
        if (value === skipAction) continue;

        result = value;
      }
    } catch (error) {
      // TODO handle error
      console.error(error);

      // Skip handler and move on
      continue;
    }
  }

  return postprocess ? postprocess({ input, output: result, handlers }) : result;
};
