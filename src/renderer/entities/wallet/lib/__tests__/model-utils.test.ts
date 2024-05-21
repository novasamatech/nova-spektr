import { modelUtils } from '../model-utils';
import { AccountType, ChainType, CryptoType, KeyType, BaseAccount, ChainAccount } from '@shared/core';
import { TEST_ACCOUNTS, TEST_CHAIN_ID } from '@shared/lib/utils';
const accounts = [
  {
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNTS[0],
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
  {
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNTS[0],
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.HOT,
    derivationPath: '//test/path_1',
  },
  {
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNTS[0],
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  },
  {
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNTS[0],
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
];

describe('entities/wallet/lib/model-onChainUtils#groupAccounts', () => {
  test('should create groups of base & chains accounts', () => {
    const { base, chains } = modelUtils.groupAccounts(accounts as (BaseAccount | ChainAccount)[]);

    expect(base).toEqual([accounts[0], accounts[3]]);
    expect(chains).toEqual([[accounts[1], accounts[2]]]);
  });
});
