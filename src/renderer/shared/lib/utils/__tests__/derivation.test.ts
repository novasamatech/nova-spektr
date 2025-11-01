import { derivationHasPassword, validateDerivation } from '@/shared/lib/utils';

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
