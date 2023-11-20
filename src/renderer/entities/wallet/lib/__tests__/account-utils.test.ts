import { AccountType, ChainAccount, ChainType, CryptoType, KeyType, ShardAccount } from '@shared/core';
import { TEST_ACCOUNT_ID, TEST_CHAIN_ID } from '@shared/lib/utils';
import { accountUtils } from "@entities/wallet";

const accounts: Array<ChainAccount | ShardAccount> = [
  {
    id: 1,
    walletId: 1,
    baseId: 1,
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
    id: 2,
    walletId: 1,
    baseId: 1,
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
    id: 3,
    walletId: 1,
    groupId: 'shard_group_1',
    chainId: TEST_CHAIN_ID,
    name: 'My shard',
    type: AccountType.SHARD,
    accountId: TEST_ACCOUNT_ID,
    keyType: KeyType.STAKING,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//staking//0',
  },
  {
    id: 4,
    walletId: 1,
    groupId: 'shard_group_1',
    chainId: TEST_CHAIN_ID,
    name: 'My shard',
    type: AccountType.SHARD,
    accountId: TEST_ACCOUNT_ID,
    keyType: KeyType.STAKING,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//staking//1',
  },
  {
    id: 5,
    walletId: 1,
    groupId: 'shard_group_2',
    chainId: TEST_CHAIN_ID,
    name: 'My shard',
    type: AccountType.SHARD,
    accountId: TEST_ACCOUNT_ID,
    keyType: KeyType.MAIN,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//0',
  },
  {
    id: 6,
    walletId: 1,
    groupId: 'shard_group_2',
    name: 'My shard',
    type: AccountType.SHARD,
    chainId: TEST_CHAIN_ID,
    accountId: TEST_ACCOUNT_ID,
    keyType: KeyType.STAKING,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//1',
  },
  {
    id: 7,
    walletId: 1,
    groupId: 'shard_group_2',
    name: 'My shard',
    type: AccountType.SHARD,
    chainId: TEST_CHAIN_ID,
    accountId: TEST_ACCOUNT_ID,
    keyType: KeyType.STAKING,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//2',
  },
];

describe('entities/wallet/lib', () => {
  test('entities/wallet/lib/account-utils', () => {
    const groupedAccount = accountUtils.getAccountsWithGroupedShards(accounts);

    const chainAccounts = [accounts[0], accounts[1]];
    const shardsGroup1 = [accounts[2], accounts[3]];
    const shardsGroup2 = [accounts[4], accounts[5], accounts[6]];

    expect(groupedAccount.length).toEqual(4);
    expect(groupedAccount.slice(0, 2)).toEqual(chainAccounts);
    expect(groupedAccount[2]).toEqual(shardsGroup1);
    expect(groupedAccount[3]).toEqual(shardsGroup2);
  });
});
