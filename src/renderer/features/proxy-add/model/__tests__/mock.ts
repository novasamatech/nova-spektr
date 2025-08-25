import { type ApiPromise } from '@polkadot/api';

import { type Chain, ChainOptions, type Wallet, WalletType } from '@/shared/core';

export const testApi = {
  key: 'test-api',
} as unknown as ApiPromise;

export const testChain = {
  name: 'test-chain',
  chainId: '0x00',
  options: [ChainOptions.REGULAR_PROXY],
} as unknown as Chain;

export const initiatorWallet = {
  id: 1,
  name: 'Wallet',
  type: WalletType.POLKADOT_VAULT,
} as Wallet;

export const signerWallet = {
  id: 2,
  name: 'Signer Wallet',
  type: WalletType.POLKADOT_VAULT,
} as Wallet;
