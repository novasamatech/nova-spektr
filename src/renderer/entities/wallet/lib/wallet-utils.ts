import type { Wallet } from '@renderer/shared/core';
import { WalletType } from '@renderer/shared/core';

export const walletUtils = {
  isSingleShard,
  isMultiShard,
  isMultisig,
  isWatchOnly,
};

function isSingleShard(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.SINGLE_PARITY_SIGNER;
}

function isMultiShard(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.MULTISHARD_PARITY_SIGNER;
}

function isMultisig(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.MULTISIG;
}

function isWatchOnly(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.WATCH_ONLY;
}
