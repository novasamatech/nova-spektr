import {
  AccountType,
  ChainType,
  CryptoType,
  KeyType,
  SigningType,
  type VaultBaseAccount,
  type VaultChainAccount,
} from '@/shared/core';
import { TEST_ACCOUNTS, TEST_CHAIN_ID } from '@/shared/lib/utils';
import { modelUtils } from '../model-utils';
const accounts = [
  {
    name: 'My base account',
    type: 'universal',
    accountType: AccountType.BASE,
    accountId: TEST_ACCOUNTS[0],
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
  },
  {
    name: 'My chain account',
    type: 'chain',
    accountType: AccountType.CHAIN,
    accountId: TEST_ACCOUNTS[0],
    chainId: TEST_CHAIN_ID,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.HOT,
    derivationPath: '//test/path_1',
  },
  {
    name: 'My chain account',
    type: 'chain',
    accountType: AccountType.CHAIN,
    accountId: TEST_ACCOUNTS[0],
    chainId: TEST_CHAIN_ID,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  },
  {
    name: 'My base account',
    type: 'universal',
    accountType: AccountType.BASE,
    accountId: TEST_ACCOUNTS[0],
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
];

describe('entities/wallet/lib/model-utils#groupAccounts', () => {
  test('should create groups of base & chains accounts', () => {
    const { base, chains } = modelUtils.groupAccounts(accounts as (VaultBaseAccount | VaultChainAccount)[]);

    expect(base).toEqual([accounts[0], accounts[3]]);
    expect(chains).toEqual([[accounts[1], accounts[2]]]);
  });
});
