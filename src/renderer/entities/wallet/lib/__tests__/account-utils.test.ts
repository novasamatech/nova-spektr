import {
  type VaultChainAccount,
  type VaultShardAccount,
  AccountType,
  CryptoType,
  KeyType,
  SigningType,
} from '@/shared/core';
import { TEST_ACCOUNTS, TEST_CHAIN_ID } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils } from '../account-utils';

const accounts: (VaultChainAccount | VaultShardAccount)[] = [
  {
    id: '1',
    type: 'chain',
    accountType: AccountType.CHAIN,
    walletId: 1,
    name: 'My chain account',
    accountId: createAccountId('1'),
    chainId: TEST_CHAIN_ID,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    keyType: KeyType.HOT,
    derivationPath: '//test/path_1',
  },
  {
    id: '2',
    type: 'chain',
    accountType: AccountType.CHAIN,
    walletId: 1,
    name: 'My chain account',
    accountId: TEST_ACCOUNTS[0],
    chainId: TEST_CHAIN_ID,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  },
  {
    id: '3',
    type: 'chain',
    accountType: AccountType.SHARD,
    walletId: 1,
    groupId: 'shard_group_1',
    chainId: TEST_CHAIN_ID,
    name: 'My shard',
    accountId: TEST_ACCOUNTS[0],
    signingType: SigningType.POLKADOT_VAULT,
    keyType: KeyType.HOT,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//staking//0',
  },
  {
    id: '4',
    type: 'chain',
    accountType: AccountType.SHARD,
    walletId: 1,
    groupId: 'shard_group_1',
    chainId: TEST_CHAIN_ID,
    name: 'My shard',
    accountId: TEST_ACCOUNTS[0],
    signingType: SigningType.POLKADOT_VAULT,
    keyType: KeyType.HOT,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//staking//1',
  },
  {
    id: '5',
    type: 'chain',
    accountType: AccountType.SHARD,
    walletId: 1,
    groupId: 'shard_group_2',
    chainId: TEST_CHAIN_ID,
    name: 'My shard',
    accountId: TEST_ACCOUNTS[0],
    signingType: SigningType.POLKADOT_VAULT,
    keyType: KeyType.MAIN,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//0',
  },
  {
    id: '6',
    type: 'chain',
    accountType: AccountType.SHARD,
    walletId: 1,
    groupId: 'shard_group_2',
    name: 'My shard',
    chainId: TEST_CHAIN_ID,
    accountId: TEST_ACCOUNTS[0],
    signingType: SigningType.POLKADOT_VAULT,
    keyType: KeyType.HOT,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//1',
  },
  {
    id: '7',
    type: 'chain',
    accountType: AccountType.SHARD,
    walletId: 1,
    groupId: 'shard_group_2',
    name: 'My shard',
    chainId: TEST_CHAIN_ID,
    accountId: TEST_ACCOUNTS[0],
    signingType: SigningType.POLKADOT_VAULT,
    keyType: KeyType.HOT,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//westend//2',
  },
];

describe('entities/wallet/lib/account-utils#getAccountsAndShardGroups', () => {
  test('should construct groups', () => {
    const groupedAccount = accountUtils.getAccountsAndShardGroups(accounts);

    const chainAccounts = [accounts[0], accounts[1]];
    const shardsGroup1 = [accounts[2], accounts[3]];
    const shardsGroup2 = [accounts[4], accounts[5], accounts[6]];

    expect(groupedAccount.length).toEqual(4);
    expect(groupedAccount.slice(0, 2)).toEqual(chainAccounts);
    expect(groupedAccount[2]).toEqual(shardsGroup1);
    expect(groupedAccount[3]).toEqual(shardsGroup2);
  });
});

describe('entities/wallet/lib/account-utils#getDerivationPath', () => {
  // Array<[argument, result]>
  const cases_1: [{ derivationPath: string }, string][] = [
    [{ derivationPath: '//westend' }, '//westend'],
    [{ derivationPath: '//westend//staking' }, '//westend//staking'],
  ];

  // Array<[argument, result]>
  const cases_2: [{ derivationPath: string }[], string][] = [
    [
      [{ derivationPath: '//westend//custom//0' }, { derivationPath: '//westend//custom//1' }],
      '//westend//custom//0...1',
    ],
    [
      [{ derivationPath: '//westend//custom/hey22-1/0' }, { derivationPath: '//westend//custom/hey22-1/1' }],
      '//westend//custom/hey22-1/0...1',
    ],
    [
      [{ derivationPath: '//westend//custom/hey-hey//0' }, { derivationPath: '//westend//custom/hey-hey//1' }],
      '//westend//custom/hey-hey//0...1',
    ],
  ];

  test.each([...cases_1, ...cases_2])(
    'should construct derivationPath for ChainAccount',
    (firstArg, expectedResult) => {
      const derivationPath = accountUtils.getDerivationPath(firstArg);
      expect(derivationPath).toEqual(expectedResult);
    },
  );

  test('should return the account ID', () => {
    const ids = ['0x00', '0x01', '0x02'] as never as AccountId[];
    const threshold = 2;
    const result = accountUtils.getMultisigAccountId(ids, threshold, CryptoType.SR25519);

    expect(result).toEqual('0x7c03b938aa7d9952e4c0f9b573e5e3a3ae9f6a9910c4f965a22803f64d7fbc68');
  });
});
