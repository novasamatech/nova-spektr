import {
  Account,
  AccountId,
  AccountType,
  ChainId,
  MultisigAccount,
  MultisigWallet,
  ProxyAccount,
  ProxyType,
  SigningType,
  Wallet,
  WalletType,
} from '@shared/core';
import { TEST_ACCOUNT_ID, TEST_ADDRESS, TEST_CHAIN_ID } from '@shared/lib/utils';

const wallet: Wallet = {
  id: 1,
  signingType: SigningType.POLKADOT_VAULT,
  type: WalletType.POLKADOT_VAULT,
  isActive: true,
  name: 'My PV',
};

const accounts: Account[] = [
  {
    id: 1,
    accountId: TEST_ACCOUNT_ID,
    chainId: TEST_CHAIN_ID,
    walletId: 1,
    name: 'My account',
    type: AccountType.BASE,
    chainType: 0,
    cryptoType: 0,
  },
  {
    id: 2,
    accountId: '0x00',
    chainId: TEST_CHAIN_ID,
    walletId: 2,
    name: 'My another account',
    type: AccountType.BASE,
    chainType: 0,
    cryptoType: 0,
  },
];

const dupAccounts: Account[] = [
  {
    id: 1,
    accountId: TEST_ACCOUNT_ID,
    chainId: TEST_CHAIN_ID,
    walletId: 1,
    name: 'My account 1',
    type: AccountType.CHAIN,
    chainType: 0,
    cryptoType: 0,
  },
  {
    id: 2,
    accountId: TEST_ACCOUNT_ID,
    chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    walletId: 1,
    name: 'My account 2',
    type: AccountType.CHAIN,
    chainType: 0,
    cryptoType: 0,
  },
];

const chains = {
  [TEST_CHAIN_ID]: {
    name: 'My chain 1',
    addressPrefix: 42,
    chainId: TEST_CHAIN_ID,
  },
  ['0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e']: {
    name: 'My chain 2',
    addressPrefix: 20,
    chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
  },
};

const proxyAccount1 = {
  accountId: '0x00' as AccountId,
  proxiedAccountId: TEST_ACCOUNT_ID as AccountId,
  id: 1,
  chainId: TEST_CHAIN_ID as ChainId,
  proxyType: ProxyType.GOVERNANCE,
  delay: 0,
};

const proxyAccount2 = {
  accountId: '0x01' as AccountId,
  proxiedAccountId: TEST_ACCOUNT_ID as AccountId,
  id: 2,
  chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e' as ChainId,
  // chainId: TEST_CHAIN_ID as ChainId,
  proxyType: ProxyType.GOVERNANCE,
  delay: 0,
};

const proxyAccounts: Record<string, ProxyAccount[]> = {
  [TEST_ACCOUNT_ID]: [proxyAccount1, proxyAccount2],
};

const multisiigWallet: MultisigWallet = {
  id: 2,
  name: 'My multisig',
  type: WalletType.MULTISIG,
  isActive: false,
  signingType: SigningType.MULTISIG,
};

const multisigAccount: MultisigAccount = {
  accountId: TEST_ACCOUNT_ID,
  id: 3,
  walletId: 2,
  type: AccountType.MULTISIG,
  name: 'Multisig account',
  cryptoType: 0,
  chainType: 0,
  threshold: 2,
  matrixRoomId: '0',
  creatorAccountId: '0x0',
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
};

const signatoriesAccounts: Account[] = [
  {
    accountId: '0x01',
    id: 4,
    walletId: 3,
    type: AccountType.BASE,
    name: 'singatory 1',
    cryptoType: 0,
    chainType: 0,
  },
  {
    accountId: '0x02',
    id: 5,
    walletId: 4,
    type: AccountType.BASE,
    name: 'singatory 2',
    cryptoType: 0,
    chainType: 0,
  },
];

const signatoriesWallets: Wallet[] = [
  {
    id: 3,
    name: 'Signatory 1 wallet',
    type: WalletType.SINGLE_PARITY_SIGNER,
    signingType: SigningType.PARITY_SIGNER,
    isActive: false,
  },
  {
    id: 4,
    name: 'Signatory 2 wallet',
    type: WalletType.SINGLE_PARITY_SIGNER,
    signingType: SigningType.PARITY_SIGNER,
    isActive: false,
  },
];

export const walletProviderMock = {
  wallet,
  accounts,
  dupAccounts,
  chains,
  proxyAccount1,
  proxyAccount2,
  proxyAccounts,
  multisiigWallet,
  multisigAccount,
  signatoriesWallets,
  signatoriesAccounts,
};
