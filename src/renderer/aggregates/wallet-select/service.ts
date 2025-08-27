import { type Chain, type Wallet, type WalletFamily, WalletType } from '@/shared/core';
import { includes, toAddress } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';
import { walletUtils } from '@/entities/wallet';

const getWalletFamily = (wallet: Wallet): WalletFamily | null => {
  if (walletUtils.isPolkadotVaultGroup(wallet)) {
    return WalletType.POLKADOT_VAULT;
  }

  return Object.values(WalletType).includes(wallet.type) ? (wallet.type as WalletFamily) : null;
};

// TODO this logic will skip new types on wallets. Let's redo it later
const getWalletByGroups = (wallets: Wallet[], query = ''): Record<WalletFamily, Wallet[]> => {
  const accumulator: Record<WalletFamily, Wallet[]> = {
    [WalletType.POLKADOT_VAULT]: [],
    [WalletType.NOVA_WALLET]: [],
    [WalletType.WALLET_CONNECT]: [],
    [WalletType.POLKADOT_EXTENSION]: [],
    [WalletType.TALISMAN_EXTENSION]: [],
    [WalletType.SUBWALLET_EXTENSION]: [],
    [WalletType.MULTISIG]: [],
    [WalletType.FLEXIBLE_MULTISIG]: [],
    [WalletType.PROXIED]: [],
    [WalletType.WATCH_ONLY]: [],
  };

  return wallets.reduce<Record<WalletFamily, Wallet[]>>((acc, wallet) => {
    const family = getWalletFamily(wallet);

    if (family && includes(wallet.name, query)) {
      acc[family].push(wallet);
    }

    return acc;
  }, accumulator);
};

const getWalletFamilyByAccounts = (wallets: Wallet[], accounts: AnyAccount[]): Record<WalletFamily, AnyAccount[]> => {
  const accumulator: Record<WalletFamily, AnyAccount[]> = {
    [WalletType.POLKADOT_VAULT]: [],
    [WalletType.NOVA_WALLET]: [],
    [WalletType.WALLET_CONNECT]: [],
    [WalletType.POLKADOT_EXTENSION]: [],
    [WalletType.TALISMAN_EXTENSION]: [],
    [WalletType.SUBWALLET_EXTENSION]: [],
    [WalletType.MULTISIG]: [],
    [WalletType.FLEXIBLE_MULTISIG]: [],
    [WalletType.PROXIED]: [],
    [WalletType.WATCH_ONLY]: [],
  };

  return accounts.reduce<Record<WalletFamily, AnyAccount[]>>((acc, account) => {
    const wallet = wallets.find(w => w.id === account.walletId);
    if (!wallet) return acc;

    const family = getWalletFamily(wallet);
    if (family) {
      acc[family].push(account);
    }

    return acc;
  }, accumulator);
};

const composeWalletMeta = (wallet: Wallet, accounts: AnyAccount[], chains: Record<string, Chain>) => {
  const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);

  return walletAccounts
    .map(account => {
      if (accountService.isUniversalAccount(account)) {
        return Object.values(chains)
          .filter(chain => accountService.isAccountAvailableOnChain(account, chain))
          .map(chain => toAddress(account.accountId, { prefix: chain.addressPrefix }))
          .join(' ');
      }

      const chain = chains[account.chainId];
      return toAddress(account.accountId, { prefix: chain?.addressPrefix });
    })
    .join(' ');
};

export const walletSelectService = {
  getWalletByGroups,
  getWalletFamilyByAccounts,
  composeWalletMeta,
};
