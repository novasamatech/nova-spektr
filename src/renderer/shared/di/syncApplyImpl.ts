import { type AnyIdentifier } from './types';

type Params<Input, Output> = {
  identifier: AnyIdentifier<Input, Output>;
  acc: Output;
  input: Input;
};

export const syncApplyImpl = <Input, Output>({ identifier, acc, input }: Params<Input, Output>): Output => {
  // eslint-disable-next-line effector/no-getState
  const handlers = identifier.$handlers.getState();
  let result = acc;

  for (let index = 0; index < handlers.length; index++) {
    const handler = handlers[index];
    if (!handler) continue;

    try {
      result = handler.fn({
        acc: result,
        input,
        index,
      });
    } catch (error) {
      // TODO handle error
      console.error(error);

      // Skip handler and move to next
      continue;
    }
  }

  return result;
};
