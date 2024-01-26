import type {
  MultiShardWallet,
  MultisigWallet,
  NovaWalletWallet,
  PolkadotVaultGroup,
  PolkadotVaultWallet,
  SingleShardWallet,
  Wallet,
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

function isPolkadotVault(wallet?: Pick<Wallet, 'type'>): wallet is PolkadotVaultWallet {
  return wallet?.type === WalletType.POLKADOT_VAULT;
}

function isMultiShard(wallet?: Pick<Wallet, 'type'>): wallet is MultiShardWallet {
  return wallet?.type === WalletType.MULTISHARD_PARITY_SIGNER;
}

function isSingleShard(wallet?: Pick<Wallet, 'type'>): wallet is SingleShardWallet {
  return wallet?.type === WalletType.SINGLE_PARITY_SIGNER;
}

function isMultisig(wallet?: Pick<Wallet, 'type'>): wallet is MultisigWallet {
  return wallet?.type === WalletType.MULTISIG;
}

function isWatchOnly(wallet?: Pick<Wallet, 'type'>): wallet is WatchOnlyWallet {
  return wallet?.type === WalletType.WATCH_ONLY;
}

function isNovaWallet(wallet?: Pick<Wallet, 'type'>): wallet is NovaWalletWallet {
  return wallet?.type === WalletType.NOVA_WALLET;
}

function isWalletConnect(wallet?: Pick<Wallet, 'type'>): wallet is WalletConnectWallet {
  return wallet?.type === WalletType.WALLET_CONNECT;
}

function isPolkadotVaultGroup(wallet?: Pick<Wallet, 'type'>): wallet is PolkadotVaultGroup {
  return isPolkadotVault(wallet) || isMultiShard(wallet) || isSingleShard(wallet);
}

function isWalletConnectGroup(wallet?: Pick<Wallet, 'type'>): wallet is WalletConnectGroup {
  return isNovaWallet(wallet) || isWalletConnect(wallet);
}

function isProxied(wallet?: Pick<Wallet, 'type'>): wallet is ProxiedWallet {
  return wallet?.type === WalletType.PROXIED;
}

const VALID_SIGNATORY_WALLET_TYPES = [
  WalletType.SINGLE_PARITY_SIGNER,
  WalletType.MULTISHARD_PARITY_SIGNER,
  WalletType.WALLET_CONNECT,
  WalletType.NOVA_WALLET,
];
function isValidSignatory(wallet?: Pick<Wallet, 'type'>): boolean {
  if (!wallet) return false;

  return VALID_SIGNATORY_WALLET_TYPES.includes(wallet.type);
}

function getWalletById(wallets: Wallet[], id: ID): Wallet | undefined {
  return wallets.find((wallet) => wallet.id === id);
}
