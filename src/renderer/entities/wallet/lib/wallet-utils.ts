import {
  type Account,
  type ID,
  type MultiShardWallet,
  type MultisigWallet,
  type NovaWalletWallet,
  type PolkadotVaultGroup,
  type PolkadotVaultWallet,
  type ProxiedWallet,
  type SingleShardWallet,
  type Wallet,
  type WalletConnectGroup,
  type WalletConnectWallet,
  WalletType,
  type WatchOnlyWallet,
} from '@shared/core';

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
  isValidSignSignatory,
  getWalletById,

  getAccountsBy,
  getWalletFilteredAccounts,
  getWalletsFilteredAccounts,
};

// Wallet types

function isPolkadotVault(wallet?: Wallet): wallet is PolkadotVaultWallet {
  return wallet?.type === WalletType.POLKADOT_VAULT;
}

function isMultiShard(wallet?: Wallet): wallet is MultiShardWallet {
  return wallet?.type === WalletType.MULTISHARD_PARITY_SIGNER;
}

function isSingleShard(wallet?: Wallet): wallet is SingleShardWallet {
  return wallet?.type === WalletType.SINGLE_PARITY_SIGNER;
}

function isMultisig(wallet?: Wallet): wallet is MultisigWallet {
  return wallet?.type === WalletType.MULTISIG;
}

function isWatchOnly(wallet?: Wallet): wallet is WatchOnlyWallet {
  return wallet?.type === WalletType.WATCH_ONLY;
}

function isNovaWallet(wallet?: Wallet): wallet is NovaWalletWallet {
  return wallet?.type === WalletType.NOVA_WALLET;
}

function isWalletConnect(wallet?: Wallet): wallet is WalletConnectWallet {
  return wallet?.type === WalletType.WALLET_CONNECT;
}
function isProxied(wallet?: Wallet): wallet is ProxiedWallet {
  return wallet?.type === WalletType.PROXIED;
}

// Groups

function isPolkadotVaultGroup(wallet?: Wallet): wallet is PolkadotVaultGroup {
  return isPolkadotVault(wallet) || isMultiShard(wallet) || isSingleShard(wallet);
}

function isWalletConnectGroup(wallet?: Wallet): wallet is WalletConnectGroup {
  return isNovaWallet(wallet) || isWalletConnect(wallet);
}

const VALID_SIGNATORY_WALLET_TYPES = [
  WalletType.SINGLE_PARITY_SIGNER,
  WalletType.MULTISHARD_PARITY_SIGNER,
  WalletType.WALLET_CONNECT,
  WalletType.NOVA_WALLET,
];
function isValidSignatory(wallet?: Wallet): boolean {
  if (!wallet) return false;

  return VALID_SIGNATORY_WALLET_TYPES.includes(wallet.type);
}

function isValidSignSignatory(wallet?: Wallet): boolean {
  if (!wallet) return false;

  return isValidSignatory(wallet) || isPolkadotVault(wallet);
}

function getWalletById(wallets: Wallet[], id: ID): Wallet | undefined {
  return wallets.find((wallet) => wallet.id === id);
}

function getAccountsBy(wallets: Wallet[], accountFn: (account: Account, wallet: Wallet) => boolean): Account[] {
  return wallets.reduce<Account[]>((acc, wallet) => {
    acc.push(...wallet.accounts.filter((account) => accountFn(account, wallet)));

    return acc;
  }, []);
}

/**
 * Returns a Wallet object that matches the provided predicates.
 * If no matching Wallet is found, returns undefined.
 *
 * @param {Wallet[]} wallets - The array of Wallet objects to search through
 * @param {Object} predicates - The predicates to filter Wallets and Accounts
 * @param {function} predicates.walletFn - A function that takes a Wallet
 *   object and returns a boolean indicating whether it should be included in
 *   the result. Defaults to undefined.
 * @param {function} predicates.accountFn - A function that takes an Account
 *   object and its parent Wallet object and returns a boolean indicating
 *   whether it should be included in the result. Defaults to undefined.
 * @return {Wallet|undefined} - The matching Wallet object, or undefined if no
 *   matching Wallet is found.
 */
function getWalletFilteredAccounts(
  wallets: Wallet[],
  predicates: {
    walletFn?: (wallet: Wallet) => boolean;
    accountFn?: (account: Account, wallet: Wallet) => boolean;
  },
): Wallet | undefined {
  if (!predicates.walletFn && !predicates.accountFn) return undefined;

  for (const wallet of wallets) {
    if (predicates.walletFn && !predicates.walletFn(wallet)) continue;

    const accounts = wallet.accounts.filter((account) => {
      return !predicates.accountFn || predicates.accountFn(account, wallet);
    });

    if (accounts.length > 0) return { ...wallet, accounts };
  }

  return undefined;
}

function getWalletsFilteredAccounts(
  wallets: Wallet[],
  predicates: {
    walletFn?: (wallet: Wallet) => boolean;
    accountFn?: (account: Account, wallet: Wallet) => boolean;
  },
): Wallet[] | undefined {
  if (!predicates.walletFn && !predicates.accountFn) return undefined;

  const result = wallets.reduce<Wallet[]>((acc, wallet) => {
    if (!predicates.walletFn || predicates.walletFn(wallet)) {
      const accounts = wallet.accounts.filter((account) => {
        return !predicates.accountFn || predicates.accountFn(account, wallet);
      });

      if (accounts.length > 0) {
        acc.push({ ...wallet, accounts });
      }
    }

    return acc;
  }, []);

  return result.length > 0 ? result : undefined;
}
