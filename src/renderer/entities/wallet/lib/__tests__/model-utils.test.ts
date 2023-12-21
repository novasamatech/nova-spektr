import { modelUtils } from '../model-utils';
import { AccountType, ChainType, CryptoType, KeyType, BaseAccount, ChainAccount } from '@shared/core';
import { TEST_ACCOUNT_ID, TEST_CHAIN_ID } from '@shared/lib/utils';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

const accounts = [
  {
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNT_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
  {
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNT_ID,
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.HOT,
    derivationPath: '//test/path_1',
  },
  {
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNT_ID,
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  },
  {
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNT_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
];

describe('entities/wallet/lib/model-utils#groupAccounts', () => {
  test('should create groups of base & chains accounts', () => {
    const { base, chains } = modelUtils.groupAccounts(accounts as (BaseAccount | ChainAccount)[]);

    expect(base).toEqual([accounts[0], accounts[3]]);
    expect(chains).toEqual([[accounts[1], accounts[2]]]);
  });
});
