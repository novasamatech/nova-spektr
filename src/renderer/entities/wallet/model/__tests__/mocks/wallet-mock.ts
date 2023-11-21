import {
  ID,
  Wallet,
  WalletType,
  SigningType,
  Account,
  AccountType,
  ChainType,
  CryptoType,
  KeyType,
  AccountId,
} from '@shared/core';
import { TEST_ACCOUNT_ID, TEST_CHAIN_ID } from '@shared/lib/utils';

function getWallets(activeId: ID): Wallet[] {
  return [
    {
      id: 1,
      name: 'My first wallet',
      isActive: false,
      type: WalletType.MULTISIG,
      signingType: SigningType.MULTISIG,
    },
    {
      id: 2,
      name: 'My second wallet',
      isActive: false,
      type: WalletType.WATCH_ONLY,
      signingType: SigningType.WATCH_ONLY,
    },
  ].map((wallet) => ({ ...wallet, isActive: wallet.id === activeId }));
}

const accounts: Account[] = [
  {
    id: 1,
    walletId: 1,
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNT_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
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
    keyType: KeyType.HOT,
    derivationPath: '//test/path_1',
  },
  {
    id: 3,
    walletId: 2,
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNT_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
  {
    id: 4,
    walletId: 2,
    baseId: 3,
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNT_ID,
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  },
];

const newWallet = {
  id: 3,
  name: 'My new wallet',
  type: WalletType.SINGLE_PARITY_SIGNER,
  signingType: SigningType.PARITY_SIGNER,
  isActive: false,
};

const newAccounts = [
  {
    id: 4,
    walletId: 3,
    name: 'My base account',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNT_ID as AccountId,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
  },
  {
    id: 5,
    walletId: 3,
    baseId: 4,
    name: 'My chain account',
    type: AccountType.CHAIN,
    accountId: TEST_ACCOUNT_ID as AccountId,
    chainId: TEST_CHAIN_ID,
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  },
];

export const walletMock = {
  getWallets,
  accounts,
  newWallet,
  newAccounts,
};
