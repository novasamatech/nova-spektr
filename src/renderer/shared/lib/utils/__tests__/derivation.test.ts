import { derivationHasPassword, validateDerivation } from '@shared/lib/utils';

describe('shared/lib/onChainUtils/derivation#validateDerivation', () => {
  // Array<[argument, result]>
  const cases: [string, boolean][] = [
    ['//', false],
    ['//polkadot', true],
    ['/polkadot', true],
    ['polkadot', false],
    ['//polkadot/key type', true],
    ['//polkadot/key type/12', true],
    ['//polkadot/key type//12', true],
    ['//polkadot/key type///12', false],
    ['///polkadot/key type/12', false],
    ['/polkadot/key__type$$ -hey-hey/12', true],
    ['/polkadot/\\key__type$$ -hey-hey/\\12', true],
  ];

  test.each(cases)('should validate "%s" derivation path as "%s"', (firstArg, expectedResult) => {
    const result = validateDerivation(firstArg);
    expect(result).toEqual(expectedResult);
  });
});

describe('shared/lib/onChainUtils/derivation#derivationHasPassword', () => {
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
