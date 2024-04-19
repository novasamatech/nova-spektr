import type {
  MultiShardWallet,
  MultisigWallet,
  NovaWalletWallet,
  PolkadotVaultGroup,
  PolkadotVaultWallet,
  SingleShardWallet,
  Wallet_NEW,
  WalletConnectGroup,
  WalletConnectWallet,
  WatchOnlyWallet,
  ProxiedWallet,
} from '@shared/core';
import { ID, WalletType } from '@shared/core';

export const walletUtils = {
  isPolkadotVault,
  isMultiShard,
  isSingleShard,
  isMultisig,
  isWatchOnly,
  isNovaWallet,
  isWalletConnect,
  isProxied,
  isWalletConnectGroup,
  isPolkadotVaultGroup,
  isValidSignatory,
  getWalletById,
};

function isPolkadotVault(wallet?: Wallet_NEW): wallet is PolkadotVaultWallet {
  return wallet?.type === WalletType.POLKADOT_VAULT;
}

function isMultiShard(wallet?: Wallet_NEW): wallet is MultiShardWallet {
  return wallet?.type === WalletType.MULTISHARD_PARITY_SIGNER;
}

function isSingleShard(wallet?: Wallet_NEW): wallet is SingleShardWallet {
  return wallet?.type === WalletType.SINGLE_PARITY_SIGNER;
}

function isMultisig(wallet?: Wallet_NEW): wallet is MultisigWallet {
  return wallet?.type === WalletType.MULTISIG;
}

function isWatchOnly(wallet?: Wallet_NEW): wallet is WatchOnlyWallet {
  return wallet?.type === WalletType.WATCH_ONLY;
}

function isNovaWallet(wallet?: Wallet_NEW): wallet is NovaWalletWallet {
  return wallet?.type === WalletType.NOVA_WALLET;
}

function isWalletConnect(wallet?: Wallet_NEW): wallet is WalletConnectWallet {
  return wallet?.type === WalletType.WALLET_CONNECT;
}

function isPolkadotVaultGroup(wallet?: Wallet_NEW): wallet is PolkadotVaultGroup {
  return isPolkadotVault(wallet) || isMultiShard(wallet) || isSingleShard(wallet);
}

function isWalletConnectGroup(wallet?: Wallet_NEW): wallet is WalletConnectGroup {
  return isNovaWallet(wallet) || isWalletConnect(wallet);
}

function isProxied(wallet?: Wallet_NEW): wallet is ProxiedWallet {
  return wallet?.type === WalletType.PROXIED;
}

const VALID_SIGNATORY_WALLET_TYPES = [
  WalletType.SINGLE_PARITY_SIGNER,
  WalletType.MULTISHARD_PARITY_SIGNER,
  WalletType.WALLET_CONNECT,
  WalletType.NOVA_WALLET,
];
function isValidSignatory(wallet?: Pick<Wallet_NEW, 'type'>): boolean {
  if (!wallet) return false;

  return VALID_SIGNATORY_WALLET_TYPES.includes(wallet.type);
}

function getWalletById(wallets: Wallet_NEW[], id: ID): Wallet_NEW | undefined {
  return wallets.find((wallet) => wallet.id === id);
}
