import { TokenType, derivationHasPassword, parseDerivation, validateDerivation } from '@/shared/lib/utils';

describe('validateDerivation - validate substrate derivation paths', () => {
  const cases: [string, boolean][] = [
    ['//polkadot', true],
    ['/polkadot', true],
    ['//polkadot//sharded//0', true],
    ['//polkadot/mixed//slashes', true],
    ['//abra✨/kadabra🎩/magic🪄/spell🧙', true],
    ['/polkadot/key__type$$-hey-hey/12', true],
    ['/polkadot/\\key__type$$-hey-hey/\\12', true],
    [
      '//abra123/kadabra456/magic789/spell0/wand42/charm99' +
        '/potion77/elixir88/hex33/sigil21//abra123/kadabra456' +
        '/magic789/spell0/wand42/charm99/potion77/elixir88/hex33' +
        '/sigil21//abra123/kadabra456/magic789/spell0/wand42/charm99' +
        '/potion77/elixir88/hex33/sigil21',
      true,
    ],
    ['//', false],
    ['polkadot', false],
    ['//polkadot/', false],
    ['//polkadot//', false],
    [' //polkadot//not_trimmed ', false],
    ['//polkadot///password', false],
    ['//polkadot///multiple//slashes', false],
    ['//polkadot/key type', false],
    ['//polkadot/key type/12', false],
  ];

  test.each(cases)('should validate "%s" derivation path as "%s"', (firstArg, expectedResult) => {
    const { isValid } = validateDerivation(firstArg);
    expect(isValid).toEqual(expectedResult);
  });
});

describe('validateDerivation - validate ethereum derivation paths', () => {
  const cases: [string, boolean][] = [
    ['//mythos', true],
    ['//mythos//main', true],
    ['//mythos/main', false],
    ['/mythos/main', false],
    ['/mythos//main', false],
    ['//polkadot///password', false],
  ];

  test.each(cases)('should validate "%s" ethereum derivation path as "%s"', (firstArg, expectedResult) => {
    const { isValid } = validateDerivation(firstArg, { isEthereumBased: true });
    expect(isValid).toEqual(expectedResult);
  });
});

describe('validateDerivation - validates uniqueness against other paths', () => {
  const cases: [string, boolean][] = [
    ['//polkadot//unique', true],
    ['//polkadot//duplicate', false],
  ];

  const otherPaths = ['//polkadot//duplicate', '//polkadot//duplicate2', '//polkadot//duplicate3'];

  test.each(cases)('should validate "%s" derivation path as "%s"', (firstArg, expectedResult) => {
    const { isValid } = validateDerivation(firstArg, { otherPaths });
    expect(isValid).toEqual(expectedResult);
  });
});

describe('derivationHasPassword', () => {
  // Array<[argument, result]>
  const cases: [string, boolean][] = [
    ['/', false],
    ['//', false],
    ['///', true],
    ['/polkadot', false],
    ['//polkadot', false],
    ['///polkadot', true],
    ['/polkadot/1', false],
    ['/polkadot//1', false],
    ['/polkadot///1', true],
  ];

  test.each(cases)('should validate "%s" derivation path with password as "%s"', (firstArg, expectedResult) => {
    const result = derivationHasPassword(firstArg);
    expect(result).toEqual(expectedResult);
  });
});

describe('parseDerivation', () => {
  test('parses empty string', () => {
    const result = parseDerivation('');
    expect(result.tokens).toEqual([]);
    expect(result.raw).toBe('');
    expect(result.shardCount).toBeUndefined();
  });

  test('parses soft derivation', () => {
    const result = parseDerivation('/polkadot/main');
    expect(result.tokens).toEqual([
      { type: TokenType.SOFT, value: '/', start: 0, end: 1 },
      { type: TokenType.SEGMENT, value: 'polkadot', start: 1, end: 9 },
      { type: TokenType.SOFT, value: '/', start: 9, end: 10 },
      { type: TokenType.SEGMENT, value: 'main', start: 10, end: 14 },
    ]);
    expect(result.shardCount).toBeUndefined();
  });

  test('parses hard derivation', () => {
    const result = parseDerivation('//polkadot//hard');
    expect(result.tokens).toEqual([
      { type: TokenType.HARD, value: '//', start: 0, end: 2 },
      { type: TokenType.SEGMENT, value: 'polkadot', start: 2, end: 10 },
      { type: TokenType.HARD, value: '//', start: 10, end: 12 },
      { type: TokenType.SEGMENT, value: 'hard', start: 12, end: 16 },
    ]);
    expect(result.shardCount).toBeUndefined();
  });

  test('parses mixed soft and hard derivation', () => {
    const result = parseDerivation('/polkadot//hard/soft');
    expect(result.tokens).toEqual([
      { type: TokenType.SOFT, value: '/', start: 0, end: 1 },
      { type: TokenType.SEGMENT, value: 'polkadot', start: 1, end: 9 },
      { type: TokenType.HARD, value: '//', start: 9, end: 11 },
      { type: TokenType.SEGMENT, value: 'hard', start: 11, end: 15 },
      { type: TokenType.SOFT, value: '/', start: 15, end: 16 },
      { type: TokenType.SEGMENT, value: 'soft', start: 16, end: 20 },
    ]);
  });

  test('parses password derivation', () => {
    const result = parseDerivation('//polkadot///password');
    expect(result.tokens).toEqual([
      { type: TokenType.HARD, value: '//', start: 0, end: 2 },
      { type: TokenType.SEGMENT, value: 'polkadot', start: 2, end: 10 },
      { type: TokenType.PASSWORD, value: '///', start: 10, end: 13 },
      { type: TokenType.SEGMENT, value: 'password', start: 13, end: 21 },
    ]);
  });

  test('parses valid shard range as last segment', () => {
    const result = parseDerivation('//polkadot//sharded//0...5');
    expect(result.tokens).toEqual([
      { type: TokenType.HARD, value: '//', start: 0, end: 2 },
      { type: TokenType.SEGMENT, value: 'polkadot', start: 2, end: 10 },
      { type: TokenType.HARD, value: '//', start: 10, end: 12 },
      { type: TokenType.SEGMENT, value: 'sharded', start: 12, end: 19 },
      { type: TokenType.HARD, value: '//', start: 19, end: 21 },
      { type: TokenType.SHARD_RANGE, value: '0...5', start: 21, end: 26 },
    ]);
    expect(result.shardCount).toBe(6); // 0 to 5 inclusive = 6 shards
  });

  test('does NOT parse shard range if not last segment', () => {
    const result = parseDerivation('//polkadot//0...5//more');
    expect(result.tokens).toEqual([
      { type: TokenType.HARD, value: '//', start: 0, end: 2 },
      { type: TokenType.SEGMENT, value: 'polkadot', start: 2, end: 10 },
      { type: TokenType.HARD, value: '//', start: 10, end: 12 },
      { type: TokenType.SEGMENT, value: '0...5', start: 12, end: 17 }, // ← SEGMENT, not SHARD_RANGE
      { type: TokenType.HARD, value: '//', start: 17, end: 19 },
      { type: TokenType.SEGMENT, value: 'more', start: 19, end: 23 },
    ]);
    expect(result.shardCount).toBeUndefined();
  });

  test('does NOT parse shard range that does not start with 0', () => {
    const result = parseDerivation('//polkadot//4...9');
    expect(result.tokens).toEqual([
      { type: TokenType.HARD, value: '//', start: 0, end: 2 },
      { type: TokenType.SEGMENT, value: 'polkadot', start: 2, end: 10 },
      { type: TokenType.HARD, value: '//', start: 10, end: 12 },
      { type: TokenType.SEGMENT, value: '4...9', start: 12, end: 17 }, // ← SEGMENT, not SHARD_RANGE
    ]);
    expect(result.shardCount).toBeUndefined();
  });

  test('parses shard range with two shards', () => {
    const result = parseDerivation('//test//0...1');
    expect(result.tokens[result.tokens.length - 1]).toEqual({
      type: TokenType.SHARD_RANGE,
      value: '0...1',
      start: 8,
      end: 13,
    });
    expect(result.shardCount).toBe(2);
  });

  test('parses shard range with large numbers', () => {
    const result = parseDerivation('//test//0...99');
    expect(result.shardCount).toBe(100);
  });

  test('preserves raw input', () => {
    const input = '//polkadot//sharded//0...5';
    const result = parseDerivation(input);
    expect(result.raw).toBe(input);
  });

  test('handles segments with special characters', () => {
    const result = parseDerivation('//polkadot_relay//account-1');
    expect(result.tokens).toEqual([
      { type: TokenType.HARD, value: '//', start: 0, end: 2 },
      { type: TokenType.SEGMENT, value: 'polkadot_relay', start: 2, end: 16 },
      { type: TokenType.HARD, value: '//', start: 16, end: 18 },
      { type: TokenType.SEGMENT, value: 'account-1', start: 18, end: 27 },
    ]);
  });

  test('handles numeric segments that are not shard ranges', () => {
    const result = parseDerivation('//polkadot//123');
    expect(result.tokens[result.tokens.length - 1]).toEqual({
      type: TokenType.SEGMENT,
      value: '123',
      start: 12,
      end: 15,
    });
    expect(result.shardCount).toBeUndefined();
  });
});
