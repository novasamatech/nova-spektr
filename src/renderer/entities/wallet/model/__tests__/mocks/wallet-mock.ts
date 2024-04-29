import {
  ID,
  Wallet,
  WalletType,
  SigningType,
  AccountType,
  ChainType,
  CryptoType,
  KeyType,
  Account,
  BaseAccount,
  ChainAccount,
} from '@shared/core';
import { TEST_ACCOUNTS, TEST_CHAIN_ID } from '@shared/lib/utils';

const accounts: Account[] = [
  {
    id: 1,
    walletId: 1,
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNTS[0],
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  } as BaseAccount,
  {
    id: 2,
    walletId: 1,
    baseId: 1,
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNTS[0],
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.HOT,
    derivationPath: '//test/path_1',
  } as ChainAccount,
  {
    id: 3,
    walletId: 2,
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNTS[0],
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  } as BaseAccount,
  {
    id: 4,
    walletId: 2,
    baseId: 3,
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNTS[0],
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  } as ChainAccount,
];

function getWallets(activeId: ID): Wallet[] {
  return [
    {
      id: 1,
      name: 'My first wallet',
      isActive: false,
      type: WalletType.MULTISIG,
      signingType: SigningType.MULTISIG,
      accounts: [accounts[0], accounts[1]],
    },
    {
      id: 2,
      name: 'My second wallet',
      isActive: false,
      type: WalletType.WATCH_ONLY,
      signingType: SigningType.WATCH_ONLY,
      accounts: [accounts[2], accounts[3]],
    },
  ].map((wallet) => ({ ...wallet, isActive: wallet.id === activeId }));
}

const newWallet = {
  id: 3,
  name: 'My new wallet',
  type: WalletType.SINGLE_PARITY_SIGNER,
  signingType: SigningType.PARITY_SIGNER,
  isActive: false,
};

const newAccounts: Account[] = [
  {
    id: 4,
    walletId: 3,
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNTS[0],
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  } as BaseAccount,
  {
    id: 5,
    walletId: 3,
    baseId: 4,
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNTS[0],
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  } as ChainAccount,
];

const newProxiedWallet = {
  id: 4,
  name: 'Proxied Wallet',
  type: WalletType.PROXIED,
  signingType: SigningType.POLKADOT_VAULT,
  isActive: false,
};

const newProxiedAccounts = [
  {
    id: 6,
    walletId: 4,
    name: 'Proxied Wallet',
    type: AccountType.PROXIED,
    accountId: TEST_ACCOUNTS[0],
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
];

export const walletMock = {
  getWallets,
  accounts,
  newWallet,
  newAccounts,
  newProxiedWallet,
  newProxiedAccounts,
};
