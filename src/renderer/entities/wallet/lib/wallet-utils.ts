import { WalletType } from '@shared/core';
import type {
  Wallet,
  PolkadotVaultWallet,
  WalletConnectWallet,
  MultisigWallet,
  SingleShardWallet,
  MultiShardWallet,
  WatchOnlyWallet,
  NovaWalletWallet,
} from '@shared/core';

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

function isWalletConnectFamily(wallet?: Pick<Wallet, 'type'>): wallet is WalletConnectWallet {
  return isNovaWallet(wallet) || isWalletConnect(wallet);
}

const VALID_SIGNATORY_WALLET_TYPES = [
  WalletType.SINGLE_PARITY_SIGNER,
  WalletType.WALLET_CONNECT,
  WalletType.NOVA_WALLET,
];
function isValidSignatory(wallet?: Wallet): boolean {
  return Boolean(wallet && VALID_SIGNATORY_WALLET_TYPES.includes(wallet.type));
}
