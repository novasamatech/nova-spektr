import type { Wallet } from '@shared/core';
import { WalletType } from '@shared/core';

export const walletUtils = {
  isPolkadotVault,
  isMultiShard,
  isSingleShard,
  isMultisig,
  isWatchOnly,
  isNovaWallet,
  isWalletConnect,
  isWalletConnectFamily,
  isValidSignatory,
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

function isValidSignatory(wallet?: Wallet | null) {
  const VALID_SIGNATORY_WALLET_TYPES = [
    WalletType.SINGLE_PARITY_SIGNER,
    WalletType.WALLET_CONNECT,
    WalletType.NOVA_WALLET,
  ];

  return wallet && VALID_SIGNATORY_WALLET_TYPES.includes(wallet.type);
}

function isNovaWallet(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.NOVA_WALLET;
}

function isWalletConnect(wallet?: Wallet | null): boolean {
  return wallet?.type === WalletType.WALLET_CONNECT;
}

function isWalletConnectFamily(wallet?: Wallet | null): boolean {
  return isNovaWallet(wallet) || isWalletConnect(wallet);
}
