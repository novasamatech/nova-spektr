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
      fn: (input) => input.acc,
    });

    const result = syncApplyImpl({
      identifier,
      acc: 'Hello',
    });

    expect(result).toBe('Hello attached');
  });
});
