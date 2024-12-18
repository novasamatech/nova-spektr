import { type ApiPromise } from '@polkadot/api';

import {
  AccountType,
  type Chain,
  type ChainAccount,
  ChainOptions,
  ChainType,
  type MultisigAccount,
  SigningType,
  type Wallet,
  WalletType,
} from '@/shared/core';

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

export const multisigWallet = {
  id: 3,
  name: 'multisig Wallet',
  isActive: false,
  type: WalletType.MULTISIG,
  signingType: SigningType.MULTISIG,
  accounts: [
    {
      accountId: '0x7f7cc72b17ac5d762869e97af14ebcc561590b6cc9eeeac7a3cdadde646c95c3',
      type: AccountType.MULTISIG,
    } as unknown as MultisigAccount,
  ],
} as Wallet;

export const signerWallet = {
  id: 2,
  name: 'Signer Wallet',
  isActive: true,
  type: WalletType.WALLET_CONNECT,
  signingType: SigningType.WALLET_CONNECT,
  accounts: [
    {
      id: 2,
      walletId: 2,
      name: 'account 2',
      type: AccountType.WALLET_CONNECT,
      accountId: '0x04dd9807d3f7008abfcbffc8cb96e8e26a71a839c7c18d471b0eea782c1b8521',
      chainType: ChainType.SUBSTRATE,
      chainId: '0x00',
    } as unknown as ChainAccount,
  ],
} as Wallet;

export const signatoryWallet = {
  id: 5,
  name: 'Signer Wallet',
  isActive: true,
  type: WalletType.WALLET_CONNECT,
  signingType: SigningType.WALLET_CONNECT,
  accounts: [
    {
      id: 5,
      walletId: 5,
      name: 'account 5',
      type: AccountType.WALLET_CONNECT,
      accountId: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
      chainType: ChainType.SUBSTRATE,
      chainId: '0x00',
    } as unknown as ChainAccount,
  ],
} as Wallet;

export const initiatorWallet = {
  id: 1,
  name: 'Wallet',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
  accounts: [
    {
      id: 1,
      walletId: 1,
      name: 'account 1',
      type: AccountType.WALLET_CONNECT,
      accountId: '0x960d75eab8e58bffcedf1fa51d85e2acb37d107e9bd7009a3473d3809122493c',
      chainType: ChainType.SUBSTRATE,
      chainId: '0x00',
    } as unknown as ChainAccount,
  ],
} as Wallet;

export const wrongChainWallet = {
  id: 4,
  name: 'Wallet Wrong Chain',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
  accounts: [
    {
      id: 4,
      walletId: 4,
      name: 'account 4',
      type: AccountType.WALLET_CONNECT,
      accountId: '0x00',
      chainType: ChainType.SUBSTRATE,
      chainId: '0x01',
    } as unknown as ChainAccount,
  ],
} as Wallet;
