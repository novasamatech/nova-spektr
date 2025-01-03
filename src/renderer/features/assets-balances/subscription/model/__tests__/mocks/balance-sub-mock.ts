import { type Account, AccountType, type Chain, type ChainId, CryptoType, type Wallet } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';

const accounts = [
  {
    id: 1,
    walletId: 1,
    accountId: TEST_ACCOUNTS[0],
    type: 'universal',
    accountType: AccountType.BASE,
    cryptoType: CryptoType.SR25519,
  },
  {
    id: 2,
    walletId: 1,
    accountId: TEST_ACCOUNTS[1],
    type: 'chain',
    accountType: AccountType.CHAIN,
    chainId: '0x02',
    cryptoType: CryptoType.SR25519,
  },
  {
    id: 3,
    walletId: 2,
    accountId: TEST_ACCOUNTS[2],
    type: 'universal',
    accountType: AccountType.BASE,
    cryptoType: CryptoType.SR25519,
  },
  {
    id: 4,
    walletId: 2,
    accountId: TEST_ACCOUNTS[3],
    type: 'chain',
    accountType: AccountType.CHAIN,
    chainId: '0x02',
    cryptoType: CryptoType.SR25519,
  },
] as unknown as Account[];

const wallets = [
  { id: 1, isActive: true, name: 'My active wallet', accounts: [accounts[0], accounts[1]] },
  { id: 2, isActive: false, name: 'My inactive wallet', accounts: [accounts[2], accounts[3]] },
] as Wallet[];

const newWallets = [
  { ...wallets[0], isActive: false },
  { ...wallets[1], isActive: true },
];

const chains = {
  '0x01': { name: 'My chain 1', chainId: '0x01' },
  '0x02': { name: 'My chain 2', chainId: '0x02' },
} as unknown as Record<ChainId, Chain>;

const apis = { '0x01': {}, '0x02': {} };

export const balanceSubMock = {
  wallets,
  newWallets,
  accountMocks: accounts,
  chains,
  apis,
};
