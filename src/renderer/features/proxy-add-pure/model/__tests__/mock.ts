import { type ApiPromise } from '@polkadot/api';

import { type Chain, SigningType, type Wallet, WalletType } from '@/shared/core';

export const testApi = {
  key: 'test-api',
  registry: {
    chainSS58: 42,
  },
} as unknown as ApiPromise;

export const testChain = {
  name: 'test-chain',
  chainId: '0x00',
  options: ['regular_proxy'],
} as unknown as Chain;

export const initiatorWallet = {
  id: 1,
  name: 'Wallet',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
} as Wallet;

export const signerWallet = {
  id: 2,
  name: 'Signer Wallet',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
} as Wallet;
