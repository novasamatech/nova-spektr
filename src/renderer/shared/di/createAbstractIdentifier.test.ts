import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';

describe('createAbstractIdentifier.', () => {
  it('should handle basic pipeline', () => {
    const identifier = createAbstractIdentifier<string, string>({
      name: 'test',
      processHandler: (handler) => handler,
    });

    identifier.registerHandler({
      // Data processing
      fn: (input) => `${input.acc} ${input.input} ${input.index}`,
    });

    const result = syncApplyImpl({
      identifier,
      acc: 'Hello',
      input: 'World',
    });

    expect(result).toBe('Hello World 0');
  });

  it('should correctly process handlers', () => {
    const identifier = createAbstractIdentifier<void, string>({
      name: 'test',
      processHandler: (handler) => ({
        fn: (value) => handler.fn(value) + ' attached',
      }),
    });

    identifier.registerHandler({
      fn: (input) => input.acc + ' World',
    });

    const result = syncApplyImpl({
      identifier,
      acc: 'Hello',
      input: undefined,
    });

    expect(result).toBe('Hello World attached');
  });

  it('should skip handler on error', () => {
    const identifier = createAbstractIdentifier<void, number>({
      name: 'test',
      processHandler: (handler) => handler,
    });

    identifier.registerHandler({
      fn: (input) => input.acc + 1,
    });
    identifier.registerHandler({
      fn: (input) => {
        throw new Error('fail');

        return input.acc + 1;
      },
    });
    identifier.registerHandler({
      fn: (input) => input.acc + 1,
    });

    const result = syncApplyImpl({
      identifier,
      acc: 0,
      input: undefined,
    });

    expect(result).toBe(2);
  });
});
