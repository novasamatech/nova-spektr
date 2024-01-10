import {
  Account,
  AccountId,
  AccountType,
  ChainAccount,
  ChainType,
  CryptoType,
  KeyType,
  ShardAccount,
} from '@shared/core';
import { TEST_ACCOUNT_ID, TEST_CHAIN_ID } from '@shared/lib/utils';
import { accountUtils } from '@entities/wallet';

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
      '//westend//custom//0..1',
    ],
    [
      [{ derivationPath: '//westend//custom/hey22-1/0' }, { derivationPath: '//westend//custom/hey22-1/1' }],
      '//westend//custom/hey22-1/0..1',
    ],
    [
      [{ derivationPath: '//westend//custom/hey-hey//0' }, { derivationPath: '//westend//custom/hey-hey//1' }],
      '//westend//custom/hey-hey//0..1',
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
    const ids = ['0x00', '0x01', '0x02'] as AccountId[];
    const threshold = 2;
    const result = accountUtils.getMultisigAccountId(ids, threshold);

    expect(result).toEqual('0x7c03b938aa7d9952e4c0f9b573e5e3a3ae9f6a9910c4f965a22803f64d7fbc68');
  });

  it('should return an empty array if no accounts match the chainId', () => {
    const accounts: Account[] = [
      { accountId: '0x01', chainId: '0x01', type: AccountType.CHAIN } as unknown as Account,
      { accountId: '0x02', chainId: '0x02', type: AccountType.CHAIN } as unknown as Account,
    ];
    const chainId = '0x03';

    const result = accountUtils.getAllAccountIds(accounts, chainId);

    expect(result).toEqual([]);
  });

  it('should return an array of unique accountIds', () => {
    const accounts: Account[] = [
      { accountId: '0x01', chainId: '0x01', type: AccountType.CHAIN } as unknown as Account,
      { accountId: '0x02', chainId: '0x01', type: AccountType.CHAIN } as unknown as Account,
      { accountId: '0x03', chainId: '0x02', type: AccountType.CHAIN } as unknown as Account,
      { accountId: '0x04', chainId: '0x02', type: AccountType.CHAIN } as unknown as Account,
      { accountId: '0x05', chainId: '0x03', type: AccountType.CHAIN } as unknown as Account,
    ];
    const chainId = '0x01';

    const result = accountUtils.getAllAccountIds(accounts, chainId);

    expect(result).toEqual(['0x01', '0x02']);
  });

  it('should include accountIds from multisig accounts', () => {
    const accounts: Account[] = [
      { accountId: '0x01', chainId: '0x01', type: AccountType.CHAIN } as unknown as Account,
      {
        accountId: '0x02',
        chainId: '0x01',
        type: AccountType.MULTISIG,
        signatories: [{ accountId: '0x03', chainId: '0x01' }],
      } as unknown as Account,
    ];
    const chainId = '0x01';

    const result = accountUtils.getAllAccountIds(accounts, chainId);

    expect(result).toEqual(['0x01', '0x02', '0x03']);
  });
});
