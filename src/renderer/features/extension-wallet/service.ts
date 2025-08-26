import { type Wallet, WalletType } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

import {
  type ExtensionAccount,
  type PolkadotExtensionWallet,
  type SubWalletExtensionWallet,
  type TalismanExtensionWallet,
} from './types';

function isPolkadotExtensionWallet(wallet: Wallet): wallet is PolkadotExtensionWallet {
  return wallet.type === WalletType.POLKADOT_EXTENSION;
}

function isTalismanExtensionWallet(wallet: Wallet): wallet is TalismanExtensionWallet {
  return wallet.type === WalletType.TALISMAN_EXTENSION;
}

function isSubWalletExtensionWallet(wallet: Wallet): wallet is SubWalletExtensionWallet {
  return wallet.type === WalletType.SUBWALLET_EXTENSION;
}

function isExtensionWallet(
  wallet: Wallet,
): wallet is PolkadotExtensionWallet | TalismanExtensionWallet | SubWalletExtensionWallet {
  return isPolkadotExtensionWallet(wallet) || isTalismanExtensionWallet(wallet) || isSubWalletExtensionWallet(wallet);
}

function isExtensionAccount(account: AnyAccount): account is ExtensionAccount {
  return 'accountType' in account && account.accountType === 'extension';
}

function isPolkadotExtensionAccount(account: ExtensionAccount): boolean {
  return account.extension === 'polkadot-js';
}

function isTalismanExtensionAccount(account: ExtensionAccount): boolean {
  return account.extension === 'talisman';
}

function isSubWalletExtensionAccount(account: ExtensionAccount): boolean {
  return account.extension === 'subwallet-js';
}

export const polkadotExtensionService = {
  isExtensionWallet,
  isExtensionAccount,
  isPolkadotExtensionAccount,
  isTalismanExtensionAccount,
  isSubWalletExtensionAccount,
  isPolkadotExtensionWallet,
  isTalismanExtensionWallet,
  isSubWalletExtensionWallet,
};
