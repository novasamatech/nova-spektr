import type { Wallet } from '@renderer/shared/core';
import { WalletType } from '@renderer/shared/core';

export const walletUtils = {
  isSingleShard,
  isMultiShard,
  isMultisig,
  isWatchOnly,
  isNovaWallet,
  isWalletConnect,
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

function isNovaWallet(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.NOVA_WALLET;
}

function isWalletConnect(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.WALLET_CONNECT;
}
