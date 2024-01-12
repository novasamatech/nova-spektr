import { combine } from 'effector';

import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { walletSelectModel } from '@features/wallets';
import { dictionary } from '@shared/lib/utils';
import { walletDetailsUtils } from '../lib/utils';
import type { MultishardMap, VaultMap } from '../lib/types';
import type { Account, Signatory, Wallet, MultisigAccount, BaseAccount, AccountId, ProxiedAccount } from '@shared/core';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { ProxyAccount } from '@shared/core';

const $accounts = combine(
  {
    accounts: walletModel.$accounts,
    details: walletSelectModel.$walletForDetails,
  },
  ({ details, accounts }): Account[] => {
    if (!details) return [];

    return accountUtils.getWalletAccounts(details.id, accounts);
  },
);

const $proxyAccounts = combine(
  {
    accounts: $accounts,
    proxies: proxyModel.$proxies,
  },
  ({ accounts, proxies }) => {
    const proxyAccounts = accounts.reduce((acc: ProxyAccount[], account: Account) => {
      if (proxies[account.accountId]) {
        acc.push(...proxies[account.accountId]);
      }

      return acc;
    }, []);

    return proxyUtils.sortAccountsByProxyType(proxyAccounts);
  },
);

const $singleShardAccount = combine(
  $accounts,
  (accounts): BaseAccount | undefined => {
    return accountUtils.getBaseAccount(accounts);
  },
  { skipVoid: false },
);

const $multiShardAccounts = combine($accounts, (accounts): MultishardMap => {
  if (accounts.length === 0) return new Map();

  return walletDetailsUtils.getMultishardMap(accounts);
});

const $multisigAccount = combine(
  {
    accounts: walletModel.$accounts,
    details: walletSelectModel.$walletForDetails,
  },
  ({ details, accounts }): MultisigAccount | undefined => {
    if (!details) return undefined;

    const match = accounts.find((account) => account.walletId === details.id);

    return match && accountUtils.isMultisigAccount(match) ? match : undefined;
  },
  { skipVoid: false },
);

type VaultAccounts = {
  root: BaseAccount;
  accountsMap: VaultMap;
};
const $vaultAccounts = combine(
  {
    accounts: $accounts,
    details: walletSelectModel.$walletForDetails,
  },
  ({ details, accounts }): VaultAccounts | undefined => {
    if (!details) return undefined;

    const root = accountUtils.getBaseAccount(accounts, details.id);
    if (!root) return undefined;

    return {
      root,
      accountsMap: walletDetailsUtils.getVaultAccountsMap(accounts),
    };
  },
  { skipVoid: false },
);

const $signatoryContacts = combine(
  {
    account: $accounts,
    accounts: walletModel.$accounts,
  },
  ({ account, accounts }): Signatory[] => {
    const multisigAccount = accounts[0];
    if (!multisigAccount || !accountUtils.isMultisigAccount(multisigAccount)) return [];

    const accountsMap = dictionary(accounts, 'accountId', () => true);

    return multisigAccount.signatories.filter((signatory) => !accountsMap[signatory.accountId]);
  },
);

const $signatoryWallets = combine(
  {
    accounts: $accounts,
    wallets: walletModel.$wallets,
  },
  ({ accounts, wallets }): [AccountId, Wallet][] => {
    const multisigAccount = accounts[0];
    if (!multisigAccount || !accountUtils.isMultisigAccount(multisigAccount)) return [];

    const walletsMap = dictionary(wallets, 'id');
    const accountsMap = dictionary(accounts, 'accountId', (account) => account.walletId);

    return multisigAccount.signatories.reduce<[AccountId, Wallet][]>((acc, signatory) => {
      const wallet = walletsMap[accountsMap[signatory.accountId]];
      if (wallet) {
        acc.push([signatory.accountId, wallet]);
      }

      return acc;
    }, []);
  },
);

const $proxyWalletForProxied = combine(
  {
    account: $accounts.map((accounts) => accounts[0] as unknown as ProxiedAccount),
    accounts: walletModel.$accounts,
    wallets: walletModel.$wallets,
    detailsWallet: walletSelectModel.$walletForDetails,
  },
  ({ account, accounts, wallets, detailsWallet }): Wallet | undefined => {
    if (!walletUtils.isProxied(detailsWallet || undefined)) return;

    const walletsDict = dictionary(wallets, 'id');
    const proxyAccount = accounts.find(
      (a) => a.accountId === account.proxyAccountId && !walletUtils.isWatchOnly(walletsDict[a.walletId]),
    );

    return proxyAccount && walletsDict[proxyAccount.walletId];
  },
);

export const walletProviderModel = {
  $accounts,
  $proxyAccounts,
  $singleShardAccount,
  $multiShardAccounts,
  $multisigAccount,
  $vaultAccounts,
  $signatoryContacts,
  $signatoryWallets,
  $proxyWalletForProxied,
};
