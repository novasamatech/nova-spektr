import { type ApiPromise } from '@polkadot/api';

import {
  AccountType,
  type Chain,
  ChainOptions,
  ChainType,
  CryptoType,
  type MultisigAccount,
  SigningType,
  type Wallet,
  WalletType,
  type WcAccount,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const testApi = {
  key: 'test-api',
} as unknown as ApiPromise;

export const testChain = {
  name: 'test-chain',
  chainId: '0x00',
  assets: [{ assetId: 0 }],
  options: [ChainOptions.MULTISIG],
  type: ChainType.SUBSTRATE,
} as unknown as Chain;

export const accounts: (WcAccount | MultisigAccount)[] = [
  {
    id: '1',
    walletId: 1,
    type: 'chain',
    name: 'account 1',
    accountType: AccountType.WALLET_CONNECT,
    cryptoType: CryptoType.SR25519,
    accountId: '0x960d75eab8e58bffcedf1fa51d85e2acb37d107e9bd7009a3473d3809122493c' as AccountId,
    signingType: SigningType.WALLET_CONNECT,
    chainId: '0x00',
    signingExtras: {},
  },
  {
    id: '2',
    walletId: 2,
    name: 'account 2',
    accountType: AccountType.WALLET_CONNECT,
    accountId: '0x04dd9807d3f7008abfcbffc8cb96e8e26a71a839c7c18d471b0eea782c1b8521' as AccountId,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.WALLET_CONNECT,
    chainId: '0x00',
    type: 'chain',
    signingExtras: {},
  },
  {
    id: '4',
    walletId: 4,
    name: 'account 4',
    type: 'chain',
    accountType: AccountType.WALLET_CONNECT,
    cryptoType: CryptoType.SR25519,
    accountId: '0x00' as AccountId,
    signingType: SigningType.WALLET_CONNECT,
    chainId: '0x01',
    signingExtras: {},
  },
  {
    id: '5',
    walletId: 5,
    type: 'chain',
    name: 'account 5',
    accountType: AccountType.WALLET_CONNECT,
    cryptoType: CryptoType.SR25519,
    accountId: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as AccountId,
    signingType: SigningType.WALLET_CONNECT,
    chainId: '0x00',
    signingExtras: {},
  },
  {
    id: '0',
    name: '',
    walletId: 3,
    signatories: [],
    threshold: 0,
    chainId: '0x00',
    signingType: SigningType.MULTISIG,
    cryptoType: CryptoType.SR25519,
    accountId: '0x7f7cc72b17ac5d762869e97af14ebcc561590b6cc9eeeac7a3cdadde646c95c3' as AccountId,
    accountType: AccountType.MULTISIG,
    type: 'chain',
  },
];

export const multisigWallet = {
  id: 3,
  name: 'multisig Wallet',
  isActive: false,
  type: WalletType.MULTISIG,
  signingType: SigningType.MULTISIG,
  accounts: [accounts[4]],
} as Wallet;

export const signerWallet = {
  id: 2,
  name: 'Signer Wallet',
  isActive: true,
  type: WalletType.WALLET_CONNECT,
  signingType: SigningType.WALLET_CONNECT,
  accounts: [accounts[1]],
} as Wallet;

export const signatoryWallet = {
  id: 5,
  name: 'Signer Wallet',
  isActive: true,
  type: WalletType.WALLET_CONNECT,
  signingType: SigningType.WALLET_CONNECT,
  accounts: [accounts[3]],
} as Wallet;

export const initiatorWallet = {
  id: 1,
  name: 'Wallet',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
  accounts: [accounts[0]],
} as Wallet;

export const wrongChainWallet = {
  id: 4,
  name: 'Wallet Wrong Chain',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
  accounts: [accounts[2]],
} as Wallet;
