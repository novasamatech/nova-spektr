import { getAccountExplorer, getExtrinsicExplorer } from '../chains';
import { TEST_ADDRESS, TEST_ACCOUNTS, TEST_SUBSTRATE_ADDRESS, TEST_HASH } from '../constants';

const explorers = [
  { name: 'Subscan', account: 'https://polkadot.subscan.io/account/{address}' },
  { name: 'Subscan', extrinsic: 'https://polkadot.subscan.io/extrinsic/{hash}' },
  { name: 'Subscan', unknown: '' },
];

describe('shared/lib/onChainUtils/chain/getAccountExplorer', () => {
  test('should return correct url from address', () => {
    const url = getAccountExplorer(explorers[0], { address: TEST_ADDRESS });
    expect(url).toEqual(`https://polkadot.subscan.io/account/${TEST_ADDRESS}`);
  });

  test('should return correct url from accountId', () => {
    const url = getAccountExplorer(explorers[0], { value: TEST_ACCOUNTS[0] });
    expect(url).toEqual(`https://polkadot.subscan.io/account/${TEST_SUBSTRATE_ADDRESS}`);
  });

  test('should return correct url from address and addressPrefix', () => {
    const url = getAccountExplorer(explorers[0], { value: TEST_ADDRESS, addressPrefix: 0 });
    expect(url).toEqual(`https://polkadot.subscan.io/account/${TEST_ADDRESS}`);
  });

  test('should return undefined', () => {
    const url = getAccountExplorer(explorers[2], { address: TEST_ADDRESS });
    expect(url).toBeUndefined();
  });
});

describe('shared/lib/onChainUtils/chain/getExtrinsicExplorer', () => {
  test('should return correct url with hash', () => {
    const url = getExtrinsicExplorer(explorers[1], TEST_HASH);
    expect(url).toEqual(`https://polkadot.subscan.io/extrinsic/${TEST_HASH}`);
  });

  test('should return undefined', () => {
    const url = getExtrinsicExplorer(explorers[2], TEST_HASH);
    expect(url).toBeUndefined();
  });
});
