import type {
  MultiShardWallet,
  MultisigWallet,
  NovaWalletWallet,
  PolkadotVaultGroup,
  PolkadotVaultWallet,
  SingleShardWallet,
  WalletConnectGroup,
  WalletConnectWallet,
  WatchOnlyWallet,
  ProxiedWallet,
  Wallet,
  Account,
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

  getAccountsBy,
  getWalletAndAccounts,
  getWalletsAndAccounts,
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

function getWalletById(wallets: Wallet[], id: ID): Wallet | undefined {
  return wallets.find((wallet) => wallet.id === id);
}

function getAccountsBy(wallets: Wallet[], accountFn: (account: Account) => boolean): Account[] {
  return wallets.reduce<Account[]>((acc, wallet) => {
    acc.push(...wallet.accounts.filter(accountFn));

    return acc;
  }, []);
}

function getWalletAndAccounts(
  wallets: Wallet[],
  predicates: {
    walletFn?: (wallet: Wallet) => boolean;
    accountFn?: (account: Account) => boolean;
  },
): { wallet: Wallet; accounts: Account[] } | undefined {
  if (!predicates.walletFn && !predicates.accountFn) return undefined;

  const { wallet, accounts } = wallets.reduce<{ wallet: Wallet | undefined; accounts: Account[] }>(
    (acc, wallet) => {
      if (acc.wallet) return acc;

      if (!predicates.walletFn || predicates.walletFn(wallet)) {
        const accounts = wallet.accounts.filter((account) => {
          return !predicates.accountFn || predicates.accountFn(account);
        });

        acc.wallet = wallet;
        acc.accounts = accounts;
      }

      return acc;
    },
    { wallet: undefined, accounts: [] },
  );

  return wallet && accounts.length > 0 ? { wallet, accounts } : undefined;
}

function getWalletsAndAccounts(
  wallets: Wallet[],
  predicates: {
    walletFn?: (wallet: Wallet) => boolean;
    accountFn?: (account: Account) => boolean;
  },
): { wallet: Wallet; accounts: Account[] }[] | undefined {
  if (!predicates.walletFn && !predicates.accountFn) return undefined;

  const result = wallets.reduce<{ wallet: Wallet; accounts: Account[] }[]>((acc, wallet) => {
    if (!predicates.walletFn || predicates.walletFn(wallet)) {
      const accounts = wallet.accounts.filter((account) => {
        return !predicates.accountFn || predicates.accountFn(account);
      });

      if (accounts.length > 0) {
        acc.push({ wallet, accounts });
      }
    }

    return acc;
  }, []);

  return result.length > 0 ? result : undefined;
}
