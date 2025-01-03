import {
  type Account,
  AccountType,
  ChainType,
  CryptoType,
  type ID,
  KeyType,
  SigningType,
  type VaultBaseAccount,
  type VaultChainAccount,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { TEST_CHAIN_ID } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';

const accounts: Account[] = [
  {
    id: '1',
    walletId: 1,
    name: 'My base account',
    type: 'universal',
    accountType: AccountType.BASE,
    accountId: createAccountId('1'),
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
  } satisfies VaultBaseAccount,
  {
    id: '2',
    walletId: 1,
    baseAccountId: createAccountId('1'),
    name: 'My chain account',
    type: 'chain',
    accountType: AccountType.CHAIN,
    accountId: createAccountId('2'),
    chainId: TEST_CHAIN_ID,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.HOT,
    derivationPath: '//test/path_1',
  } satisfies VaultChainAccount,
  {
    id: '3',
    walletId: 2,
    name: 'My base account',
    type: 'universal',
    accountType: AccountType.BASE,
    accountId: createAccountId('3'),
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
  } satisfies VaultBaseAccount,
  {
    type: 'chain',
    id: '4',
    walletId: 2,
    baseAccountId: createAccountId('3'),
    name: 'My chain account',
    accountType: AccountType.CHAIN,
    accountId: createAccountId('4'),
    chainId: TEST_CHAIN_ID,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  } satisfies VaultChainAccount,
  {
    id: '5',
    walletId: 3,
    name: 'My base account',
    type: 'universal',
    accountType: AccountType.BASE,
    accountId: createAccountId('5'),
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
  } satisfies VaultBaseAccount,
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
    {
      id: 3,
      name: 'My third wallet',
      isActive: false,
      isHidden: true,
      type: WalletType.MULTISIG,
      signingType: SigningType.MULTISIG,
      accounts: [accounts[4]],
    },
  ].map((wallet) => ({ ...wallet, isActive: wallet.id === activeId }));
}

const newWallet = {
  id: 4,
  name: 'My new wallet',
  type: WalletType.SINGLE_PARITY_SIGNER,
  signingType: SigningType.PARITY_SIGNER,
  isActive: false,
};

const newAccounts: Account[] = [
  {
    id: '4',
    walletId: 3,
    type: 'universal',
    name: 'My base account',
    accountType: AccountType.BASE,
    accountId: createAccountId('4'),
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
  } satisfies VaultBaseAccount,
  {
    id: '5',
    walletId: 3,
    baseAccountId: createAccountId('4'),
    type: 'chain',
    name: 'My chain account',
    accountType: AccountType.CHAIN,
    accountId: createAccountId('5'),
    chainId: TEST_CHAIN_ID,
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    derivationPath: '//test/path_2',
  } satisfies VaultChainAccount,
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
    accountType: AccountType.PROXIED,
    accountId: createAccountId('6'),
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
