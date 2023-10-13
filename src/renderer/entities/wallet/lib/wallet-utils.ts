import type { Wallet } from '@renderer/shared/core';
import { WalletType } from '@renderer/shared/core';

export const walletUtils = {
  isSingleShard,
  isMultiShard,
  isMultisig,
  isWatchOnly,
  isWalidSignatory: isValidSignatory,
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

function isValidSignatory(wallet?: Wallet | null) {
  // TODO: add wallet connect
  const VALID_SIGNATORY_WALLET_TYPES = [WalletType.SINGLE_PARITY_SIGNER];

  return wallet && VALID_SIGNATORY_WALLET_TYPES.includes(wallet.type);
}
