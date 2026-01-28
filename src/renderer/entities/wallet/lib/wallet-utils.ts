import {
  type FlexibleMultisigWallet,
  type ID,
  type MultisigWallet,
  type NovaWalletWallet,
  type PolkadotVaultGroup,
  type PolkadotVaultWallet,
  type ProxiedWallet,
  type SingleShardWallet,
  type Wallet,
  type WalletConnectGroup,
  type WalletConnectWallet,
  type WatchOnlyWallet,
  WalletType,
} from '@/shared/core';
import { type AnyAccount } from '@/domains/network';
import {
  type PolkadotExtensionWallet,
  type SubWalletExtensionWallet,
  type TalismanExtensionWallet,
} from '@/features/extension-wallet';

export const walletUtils = {
  isPolkadotVault,
  isSingleShard,
  isAnyMultisig,
  isFlexibleMultisig,
  isRegularMultisig,
  isWatchOnly,
  isNovaWallet,
  isWalletConnect,
  isProxied,
  isWalletConnectGroup,
  isPolkadotVaultGroup,
  isPolkadotExtension,
  isTalismanExtension,
  isSubWalletExtension,

  getWalletById,

  getAccountBy,
  getAccountsBy,
  getWalletFilteredAccounts,
  getWalletsFilteredAccounts,
};

// Wallet types

function isPolkadotVault(wallet?: Wallet | null): wallet is PolkadotVaultWallet {
  return wallet?.type === WalletType.POLKADOT_VAULT;
}

function isSingleShard(wallet?: Wallet | null): wallet is SingleShardWallet {
  return wallet?.type === WalletType.SINGLE_PARITY_SIGNER;
}

function isFlexibleMultisig(wallet?: Wallet | null): wallet is FlexibleMultisigWallet {
  return wallet?.type === WalletType.FLEXIBLE_MULTISIG;
}

function isRegularMultisig(wallet?: Wallet | null): wallet is MultisigWallet {
  return wallet?.type === WalletType.MULTISIG;
}

function isAnyMultisig(wallet?: Wallet | null): wallet is MultisigWallet | FlexibleMultisigWallet {
  return isFlexibleMultisig(wallet) || isRegularMultisig(wallet);
}

function isWatchOnly(wallet?: Wallet | null): wallet is WatchOnlyWallet {
  return wallet?.type === WalletType.WATCH_ONLY;
}

function isNovaWallet(wallet?: Wallet | null): wallet is NovaWalletWallet {
  return wallet?.type === WalletType.NOVA_WALLET;
}

function isWalletConnect(wallet?: Wallet | null): wallet is WalletConnectWallet {
  return wallet?.type === WalletType.WALLET_CONNECT;
}

function isProxied(wallet?: Wallet | null): wallet is ProxiedWallet {
  return wallet?.type === WalletType.PROXIED;
}

function isPolkadotExtension(wallet?: Wallet | null): wallet is PolkadotExtensionWallet {
  return wallet?.type === WalletType.POLKADOT_EXTENSION;
}

function isTalismanExtension(wallet?: Wallet | null): wallet is TalismanExtensionWallet {
  return wallet?.type === WalletType.TALISMAN_EXTENSION;
}

function isSubWalletExtension(wallet?: Wallet | null): wallet is SubWalletExtensionWallet {
  return wallet?.type === WalletType.SUBWALLET_EXTENSION;
}

// Groups

function isPolkadotVaultGroup(wallet?: Wallet): wallet is PolkadotVaultGroup {
  return isPolkadotVault(wallet) || isSingleShard(wallet);
}

function isWalletConnectGroup(wallet?: Wallet): wallet is WalletConnectGroup {
  return isNovaWallet(wallet) || isWalletConnect(wallet);
}

function getWalletById(wallets: Wallet[], id: ID): Wallet | undefined {
  return wallets.find((wallet) => wallet.id === id);
}

function getAccountsBy(wallets: Wallet[], accountFn: (account: AnyAccount, wallet: Wallet) => boolean): AnyAccount[] {
  return wallets.reduce<AnyAccount[]>((acc, wallet) => {
    acc.push(...wallet.accounts.filter((account) => accountFn(account, wallet)));

    return acc;
  }, []);
}

function getAccountBy(
  wallets: Wallet[],
  accountFn: (account: AnyAccount, wallet: Wallet) => boolean,
): AnyAccount | null {
  for (const wallet of wallets) {
    const account = wallet.accounts.find((account) => accountFn(account, wallet));

    if (account) return account;
  }

  return null;
}

/**
 * Returns a Wallet that matches the provided predicates. If no matching Wallet
 * is found, returns null.
 *
 * @param {Wallet[]} wallets - The array of Wallet objects to search through
 * @param {Object} predicates - The predicates to filter Wallets and Accounts
 * @param {Function} [predicates.walletFn] - A function to filter wallets. If
 *   provided, only wallets that pass this filter will be considered.
 * @param {Function} [predicates.accountFn] - A function to filter accounts
 *   within a wallet. If provided, only accounts that pass this filter will be
 *   included in the result.
 *
 * @returns {Wallet | null}
 */
function getWalletFilteredAccounts(
  wallets: Wallet[],
  predicates: {
    walletFn?: (wallet: Wallet) => boolean;
    accountFn?: (account: AnyAccount, wallet: Wallet) => boolean;
  },
): Wallet | null {
  if (!predicates.walletFn && !predicates.accountFn) return null;

  for (const wallet of wallets) {
    if (predicates.walletFn && !predicates.walletFn(wallet)) continue;

    const accounts = wallet.accounts.filter((account) => {
      return !predicates.accountFn || predicates.accountFn(account, wallet);
    });

    if (accounts.length > 0) return { ...wallet, accounts };
  }

  return null;
}

/**
 * Returns Wallets that match the provided predicates. If no matching Wallets
 * are found, returns null.
 *
 * @param {Wallet[]} wallets - The array of Wallet objects to search through
 * @param {Object} predicates - The predicates to filter Wallets and Accounts
 * @param {Function} [predicates.walletFn] - A function to filter wallets. If
 *   provided, only wallets that pass this filter will be considered.
 * @param {Function} [predicates.accountFn] - A function to filter accounts
 *   within a wallet. If provided, only accounts that pass this filter will be
 *   included in the result.
 *
 * @returns {Wallet[] | null}
 */
function getWalletsFilteredAccounts(
  wallets: Wallet[],
  predicates: {
    walletFn?: (wallet: Wallet) => boolean;
    accountFn?: (account: AnyAccount, wallet: Wallet) => boolean;
  },
): Wallet[] | null {
  if (!predicates.walletFn && !predicates.accountFn) return null;

  const result: Wallet[] = [];

  for (const wallet of wallets) {
    if (!predicates.walletFn || predicates.walletFn(wallet)) {
      const accounts = wallet.accounts.filter((account) => {
        return !predicates.accountFn || predicates.accountFn(account, wallet);
      });

      if (accounts.length > 0) {
        result.push({ ...wallet, accounts });
      }
    }
  }

  return result.length > 0 ? result : null;
}
