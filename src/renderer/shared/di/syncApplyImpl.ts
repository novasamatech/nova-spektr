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
    if (!handlers) continue;

    try {
      result = handler.fn({
        acc: result,
        input,
        index,
      });
    } catch (error) {
      // TODO handle error
      console.error(error);

      // Simply skipping this handler and moving to next
      continue;
    }
  }

  return result;
};
