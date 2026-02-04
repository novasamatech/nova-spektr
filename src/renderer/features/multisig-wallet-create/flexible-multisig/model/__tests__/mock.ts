import { type ApiPromise } from '@polkadot/api';

import {
  type Chain,
  type MultisigAccount,
  type Wallet,
  AccountType,
  ChainOptions,
  ChainType,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { createAccountId, polkadotChainId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const testApi = {
  key: 'test-api',
} as unknown as ApiPromise;

export const testChain = {
  name: 'test-chain',
  chainId: '0x00',
  options: [ChainOptions.MULTISIG],
  assets: [{ assetId: 0 }],
  type: ChainType.SUBSTRATE,
} as unknown as Chain;

export const multisigWallet: Wallet = {
  id: 3,
  name: 'multisig Wallet',
  type: WalletType.MULTISIG,
  accounts: [
    {
      id: '3',
      walletId: 3,
      type: 'universal',
      accountId: '0x7f7cc72b17ac5d762869e97af14ebcc561590b6cc9eeeac7a3cdadde646c95c3' as AccountId,
      accountType: AccountType.MULTISIG,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.MULTISIG,
      threshold: 1,
      name: '',
      signatories: [],
      createdAt: Date.now(),
    } satisfies MultisigAccount,
  ],
};

export const signerWallet: Wallet = {
  id: 2,
  name: 'Signer Wallet',
  type: WalletType.WALLET_CONNECT,
  accounts: [
    {
      id: '2',
      walletId: 2,
      name: 'account 2',
      type: 'chain',
      accountId: '0x04dd9807d3f7008abfcbffc8cb96e8e26a71a839c7c18d471b0eea782c1b8521' as AccountId,
      chainId: polkadotChainId,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WALLET_CONNECT,
      accountType: AccountType.WALLET_CONNECT,
      signingExtras: {},
      createdAt: Date.now(),
    },
  ],
};

export const signatoryWallet: Wallet = {
  id: 5,
  name: 'Signer Wallet',
  type: WalletType.WALLET_CONNECT,
  accounts: [
    {
      id: '5',
      walletId: 5,
      accountId: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as AccountId,
      chainId: polkadotChainId,
      signingType: SigningType.WALLET_CONNECT,
      cryptoType: CryptoType.SR25519,
      name: 'account 2',
      accountType: AccountType.WALLET_CONNECT,
      type: 'chain',
      signingExtras: {},
      createdAt: Date.now(),
    },
  ],
};

export const initiatorWallet: Wallet = {
  id: 1,
  name: 'Wallet',
  type: WalletType.POLKADOT_VAULT,
  accounts: [
    {
      id: '1',
      walletId: 1,
      accountId: '0x960d75eab8e58bffcedf1fa51d85e2acb37d107e9bd7009a3473d3809122493c' as AccountId,
      chainId: polkadotChainId,
      signingType: SigningType.WALLET_CONNECT,
      cryptoType: CryptoType.SR25519,
      name: 'account 2',
      accountType: AccountType.WALLET_CONNECT,
      type: 'chain',
      signingExtras: {},
      createdAt: Date.now(),
    },
  ],
};

export const wrongChainWallet: Wallet = {
  id: 4,
  name: 'Wallet Wrong Chain',
  type: WalletType.POLKADOT_VAULT,
  accounts: [
    {
      id: '4',
      walletId: 4,
      accountId: createAccountId(`Wc account 4`),
      chainId: '0x00',
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      name: '',
      accountType: AccountType.WALLET_CONNECT,
      type: 'chain',
      signingExtras: {},
      createdAt: Date.now(),
    },
  ],
};

export const accounts = [
  ...multisigWallet.accounts,
  ...signerWallet.accounts,
  ...signatoryWallet.accounts,
  ...initiatorWallet.accounts,
  ...wrongChainWallet.accounts,
];
