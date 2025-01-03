import {
  type ProxyAccount,
  type ProxyDeposits,
  type VaultBaseAccount,
  type Wallet,
  type WcAccount,
} from '@/shared/core';
import { AccountType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

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
        id: '1',
        walletId: 1,
        type: 'universal',
        name: 'My base account',
        accountType: AccountType.BASE,
        accountId: TEST_ACCOUNTS[0],
        signingType: SigningType.MULTISIG,
        cryptoType: CryptoType.SR25519,
      } satisfies VaultBaseAccount,
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
        id: '2',
        walletId: 2,
        type: 'chain',
        name: 'Chain 1',
        accountType: AccountType.WALLET_CONNECT,
        accountId: TEST_ACCOUNTS[1],
        signingType: SigningType.WALLET_CONNECT,
        cryptoType: CryptoType.SR25519,
        chainId: '0x001',
        signingExtras: {},
      } satisfies WcAccount,
      {
        id: '3',
        walletId: 2,
        type: 'chain',
        name: 'Chain 2',
        accountType: AccountType.WALLET_CONNECT,
        accountId: TEST_ACCOUNTS[1],
        signingType: SigningType.WALLET_CONNECT,
        cryptoType: CryptoType.SR25519,
        chainId: '0x002',
        signingExtras: {},
      } satisfies WcAccount,
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
    accountId: '0x01' as AccountId,
    proxiedAccountId: '0x02' as AccountId,
    chainId: '0x05',
    proxyType: 'CancelProxy',
    delay: 0,
  },
  {
    id: 2,
    accountId: '0x01' as AccountId,
    proxiedAccountId: '0x02' as AccountId,
    chainId: '0x05',
    proxyType: 'CancelProxy',
    delay: 0,
  },
  {
    id: 3,
    accountId: '0x01' as AccountId,
    proxiedAccountId: '0x02' as AccountId,
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
