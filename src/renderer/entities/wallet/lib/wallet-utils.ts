import type { Wallet } from '@renderer/shared/core';
import { WalletType } from '@renderer/shared/core';

export const walletUtils = {
  isPolkadotVault,
  isMultiShard,
  isSingleShard,
  isMultisig,
  isWatchOnly,
};

function isPolkadotVault(wallet?: Wallet | null): boolean {
  const isPolkadotVault = wallet?.type === WalletType.POLKADOT_VAULT;
  const isMultiShard = wallet?.type === WalletType.MULTISHARD_PARITY_SIGNER;
  const isSingleShard = wallet?.type === WalletType.SINGLE_PARITY_SIGNER;

  return isPolkadotVault || isMultiShard || isSingleShard;
}

function isMultiShard(wallet?: Wallet | null): boolean {
  const isPolkadotVault = wallet?.type === WalletType.POLKADOT_VAULT;
  const isMultiShard = wallet?.type === WalletType.MULTISHARD_PARITY_SIGNER;

  return isPolkadotVault || isMultiShard;
}

function isSingleShard(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.SINGLE_PARITY_SIGNER;
}

function isMultisig(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.MULTISIG;
}

function isWatchOnly(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.WATCH_ONLY;
}
