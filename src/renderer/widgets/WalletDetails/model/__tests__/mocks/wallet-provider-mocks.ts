import {
  type AccountId,
  AccountType,
  type BaseAccount,
  type ChainAccount,
  KeyType,
  type MultisigWallet,
  type ProxiedAccount,
  type ProxyAccount,
  ProxyType,
  SigningType,
  type Wallet,
  WalletType,
} from '@shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@shared/lib/utils';

const wallets: Wallet[] = [
  {
    id: 1,
    signingType: SigningType.POLKADOT_VAULT,
    type: WalletType.POLKADOT_VAULT,
    isActive: true,
    name: 'My PV',
    accounts: [
      {
        id: 1,
        accountId: TEST_ACCOUNTS[0],
        chainId: '0x01',
        walletId: 1,
        name: 'My account',
        type: AccountType.CHAIN,
        chainType: 0,
        cryptoType: 0,
        keyType: KeyType.GOVERNANCE,
        derivationPath: '//chain/1',
      } as unknown as ChainAccount,
      {
        id: 2,
        accountId: TEST_ACCOUNTS[1],
        chainId: '0x01',
        walletId: 1,
        name: 'My another account',
        type: AccountType.CHAIN,
        chainType: 0,
        cryptoType: 0,
        keyType: KeyType.GOVERNANCE,
        derivationPath: '//chain/2',
      } as unknown as ChainAccount,
    ],
  },
  {
    id: 2,
    signingType: SigningType.POLKADOT_VAULT,
    type: WalletType.PROXIED,
    isActive: false,
    name: 'My Proxied',
    accounts: [
      {
        id: 3,
        accountId: TEST_ACCOUNTS[2],
        chainId: '0x01',
        walletId: 2,
        name: 'My proxied account',
        type: AccountType.PROXIED,
        proxyAccountId: TEST_ACCOUNTS[0],
        chainType: 0,
        cryptoType: 0,
      } as unknown as ProxiedAccount,
    ],
  },
];

const dupAccounts = [
  {
    id: 1,
    walletId: 1,
    accountId: TEST_ACCOUNTS[0],
    chainId: '0x01',
    name: 'My account 1',
    type: AccountType.CHAIN,
    chainType: 0,
    cryptoType: 0,
  },
  {
    id: 2,
    walletId: 1,
    accountId: TEST_ACCOUNTS[0],
    chainId: '0x02',
    name: 'My account 2',
    type: AccountType.CHAIN,
    chainType: 0,
    cryptoType: 0,
  },
];

const chains = {
  '0x01': {
    name: 'My chain 1',
    addressPrefix: 42,
    chainId: '0x01',
  },
  '0x02': {
    name: 'My chain 2',
    addressPrefix: 20,
    chainId: '0x02',
  },
};

const proxyAccounts: ProxyAccount[] = [
  {
    id: 3,
    accountId: '0x00' as AccountId,
    proxiedAccountId: TEST_ACCOUNTS[0],
    chainId: '0x01',
    proxyType: ProxyType.GOVERNANCE,
    delay: 0,
  },
  {
    id: 4,
    accountId: '0x01' as AccountId,
    proxiedAccountId: TEST_ACCOUNTS[0],
    chainId: '0x02',
    proxyType: ProxyType.GOVERNANCE,
    delay: 0,
  },
];

const proxies: Record<string, ProxyAccount[]> = {
  [TEST_ACCOUNTS[0]]: proxyAccounts,
};

const multisiigWallet: MultisigWallet = {
  id: 2,
  name: 'My multisig',
  type: WalletType.MULTISIG,
  isActive: false,
  signingType: SigningType.MULTISIG,
  accounts: [
    {
      accountId: TEST_ACCOUNTS[0],
      id: 3,
      walletId: 2,
      type: AccountType.MULTISIG,
      name: 'Multisig account',
      cryptoType: 0,
      chainType: 0,
      threshold: 2,
      matrixRoomId: '0',
      creatorAccountId: TEST_ACCOUNTS[1],
      signatories: [
        {
          accountId: '0x01',
          address: TEST_ADDRESS,
        },
        {
          accountId: '0x02',
          address: TEST_ADDRESS,
        },
      ],
    },
  ],
};

const signatoriesWallets: Wallet[] = [
  {
    id: 3,
    name: 'Signatory 1 wallet',
    type: WalletType.SINGLE_PARITY_SIGNER,
    signingType: SigningType.PARITY_SIGNER,
    isActive: false,
    accounts: [
      {
        accountId: '0x01',
        id: 4,
        walletId: 3,
        type: AccountType.BASE,
        name: 'singatory 1',
        cryptoType: 0,
        chainType: 0,
      } as BaseAccount,
    ],
  },
  {
    id: 4,
    name: 'Signatory 2 wallet',
    type: WalletType.SINGLE_PARITY_SIGNER,
    signingType: SigningType.PARITY_SIGNER,
    isActive: false,
    accounts: [
      {
        accountId: '0x02',
        id: 5,
        walletId: 4,
        type: AccountType.BASE,
        name: 'singatory 2',
        cryptoType: 0,
        chainType: 0,
      } as BaseAccount,
    ],
  },
];

export const walletProviderMocks = {
  wallets,
  dupAccounts,
  chains,
  proxyAccounts,
  proxies,
  multisiigWallet,
  signatoriesWallets,
};
