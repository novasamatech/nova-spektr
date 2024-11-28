import { networkUtils } from '../network-utils';

describe('entities/network/lib/network-utils', () => {
  test.each([
    ['Polkadot', 'polkadot'],
    ['Kusama', 'kusama'],
    ['Novasama Testnet - Governance', 'novasama-testnet-governance'],
    ['Name with (braces)', 'name-with-braces'],
    ['Name with  spaces', 'name-with-spaces'],
    ['Name with /.,.&!@#$', 'name-with'],
  ])('should convert chain name to url', (firstArg, expectedResult) => {
    const url = networkUtils.chainNameToUrl(firstArg);

    expect(url).toEqual(expectedResult);
  });
});
