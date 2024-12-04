import { createAbstractIdentifier } from './createAbstractIdentifier';
import { syncApplyImpl } from './syncApplyImpl';

describe('createAbstractIdentifier.', () => {
  it('should handle basic pipeline', () => {
    const identifier = createAbstractIdentifier<string, string>({
      type: 'test',
      name: 'test',
      processHandler: (handler) => handler,
    });

    identifier.registerHandler({
      available: () => true,
      body: (input) => `${input.acc} ${input.input} ${input.index}`,
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
      type: 'test',
      name: 'test',
      processHandler: (handler) => ({
        available: () => true,
        body: (value) => handler.body(value) + ' attached',
      }),
    });

    identifier.registerHandler({
      available: () => true,
      body: (input) => input.acc + ' World',
    });

    const result = syncApplyImpl({
      identifier,
      acc: 'Hello',
      input: undefined,
    });

    expect(result).toBe('Hello World attached');
  });

  it("should skip handler when it's unavailable", () => {
    const identifier = createAbstractIdentifier<void, string>({
      type: 'test',
      name: 'test',
      processHandler: (handler) => handler,
    });

    identifier.registerHandler({
      available: () => false,
      body: (input) => input.acc + ' World',
    });

    const result = syncApplyImpl({
      identifier,
      acc: 'Hello',
      input: undefined,
    });

    expect(result).toBe('Hello');
  });

  it('should skip handler on error', () => {
    const identifier = createAbstractIdentifier<void, number>({
      type: 'test',
      name: 'test',
      processHandler: (handler) => handler,
    });

    identifier.registerHandler({
      available: () => true,
      body: (input) => input.acc + 1,
    });
    identifier.registerHandler({
      available: () => true,
      body: (input) => {
        throw new Error('fail');

        return input.acc + 1;
      },
    });
    identifier.registerHandler({
      available: () => true,
      body: (input) => input.acc + 1,
    });

    const result = syncApplyImpl({
      identifier,
      acc: 0,
      input: undefined,
    });

    expect(result).toBe(2);
  });
});
