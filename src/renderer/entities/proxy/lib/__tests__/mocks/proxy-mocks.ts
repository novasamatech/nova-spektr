import { type BaseAccount, type ProxyAccount, type ProxyDeposits, type Wallet, type WcAccount } from '@/shared/core';
import { AccountType, ChainType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';

const oldProxy: ProxyAccount = {
  id: 1,
  accountId: TEST_ACCOUNTS[0],
  proxiedAccountId: TEST_ACCOUNTS[1],
  chainId: '0x05',
  proxyType: 'Any',
  delay: 0,
};

const newProxy: ProxyAccount = {
  id: 2,
  accountId: TEST_ACCOUNTS[1],
  proxiedAccountId: TEST_ACCOUNTS[2],
  chainId: '0x04',
  proxyType: 'CancelProxy',
  delay: 0,
};

const wallets: Wallet[] = [
  {
    id: 1,
    name: 'My first wallet',
    isActive: false,
    type: WalletType.MULTISIG,
    signingType: SigningType.MULTISIG,
    accounts: [
      {
        id: 1,
        walletId: 1,
        name: 'My base account',
        type: AccountType.BASE,
        accountId: TEST_ACCOUNTS[0],
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      } as BaseAccount,
    ],
  },
  {
    id: 2,
    name: 'My second wallet',
    isActive: true,
    type: WalletType.WALLET_CONNECT,
    signingType: SigningType.WALLET_CONNECT,
    accounts: [
      {
        id: 2,
        walletId: 2,
        name: 'Chain 1',
        type: AccountType.WALLET_CONNECT,
        accountId: TEST_ACCOUNTS[1],
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
        chainId: '0x001',
      } as WcAccount,
      {
        id: 3,
        walletId: 2,
        name: 'Chain 2',
        type: AccountType.WALLET_CONNECT,
        accountId: TEST_ACCOUNTS[1],
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
        chainId: '0x002',
      } as WcAccount,
    ],
  },
];
const deposits: ProxyDeposits[] = [
  {
    chainId: '0x001',
    deposits: { [TEST_ACCOUNTS[0]]: '100' },
  },
  {
    chainId: '0x001',
    deposits: { [TEST_ACCOUNTS[1]]: '200' },
  },
];

const proxyAccounts: ProxyAccount[] = [
  {
    id: 1,
    accountId: '0x01',
    proxiedAccountId: '0x02',
    chainId: '0x05',
    proxyType: 'CancelProxy',
    delay: 0,
  },
  {
    id: 2,
    accountId: '0x01',
    proxiedAccountId: '0x02',
    chainId: '0x05',
    proxyType: 'CancelProxy',
    delay: 0,
  },
  {
    id: 3,
    accountId: '0x01',
    proxiedAccountId: '0x02',
    chainId: '0x05',
    proxyType: 'NonTransfer',
    delay: 0,
  },
];

export const proxyMock = {
  oldProxy,
  newProxy,
  wallets,
  deposits,
  proxyAccounts,
};
