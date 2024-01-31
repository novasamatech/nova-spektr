import { uniqBy } from 'lodash';
import { combine, createEvent, createStore, sample } from 'effector';

import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { walletSelectModel } from '@features/wallets';
import { dictionary } from '@shared/lib/utils';
import { walletDetailsUtils } from '../lib/utils';
import type { MultishardMap, VaultMap } from '../lib/types';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { ProxyAccount } from '@shared/core';
import { networkModel } from '@entities/network';
import { removeProxyModel } from '@widgets/RemoveProxy';
import type {
  Account,
  Signatory,
  Wallet,
  MultisigAccount,
  BaseAccount,
  AccountId,
  ProxiedAccount,
  ChainId,
} from '@shared/core';

const removeProxy = createEvent<ProxyAccount>();

const $proxyForRemoval = createStore<ProxyAccount | null>(null).reset(removeProxyModel.events.proxyRemoved);
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

const $proxiesByChain = combine(
  {
    accounts: $accounts,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
  },
  ({ accounts, chains, proxies }): Record<ChainId, ProxyAccount[]> => {
    const proxiesForAccounts = uniqBy(accounts, 'accountId').reduce<ProxyAccount[]>((acc, account) => {
      if (proxies[account.accountId]) {
        acc.push(...proxies[account.accountId]);
      }

      return acc;
    }, []);

    const chainsMap = Object.keys(chains).reduce<Record<ChainId, ProxyAccount[]>>((acc, chainId) => {
      acc[chainId as ChainId] = [];

      return acc;
    }, {});

    return proxyUtils.sortAccountsByProxyType(proxiesForAccounts).reduce((acc, proxy) => {
      acc[proxy.chainId].push(proxy);

      return acc;
    }, chainsMap);
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
    activeAccounts: $accounts,
    accounts: walletModel.$accounts,
  },
  ({ activeAccounts, accounts }): Signatory[] => {
    const multisigAccount = activeAccounts[0];
    if (!multisigAccount || !accountUtils.isMultisigAccount(multisigAccount)) return [];

    const accountsMap = dictionary(accounts, 'accountId', () => true);

    return multisigAccount.signatories.filter((signatory) => !accountsMap[signatory.accountId]);
  },
);

const $signatoryWallets = combine(
  {
    walletAccounts: $accounts,
    accounts: walletModel.$accounts,
    wallets: walletModel.$wallets,
  },
  ({ walletAccounts, accounts, wallets }): [AccountId, Wallet][] => {
    const multisigAccount = walletAccounts[0];
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
    walletAccounts: $accounts,
    accounts: walletModel.$accounts,
    wallets: walletModel.$wallets,
    detailsWallet: walletSelectModel.$walletForDetails,
  },
  ({ walletAccounts, accounts, wallets, detailsWallet }): Wallet | undefined => {
    if (!walletUtils.isProxied(detailsWallet || undefined)) return;

    const proxiedAccount = walletAccounts[0] as unknown as ProxiedAccount;
    const walletsMap = dictionary(wallets, 'id');
    const proxyAccount = accounts.find(
      (a) => a.accountId === proxiedAccount.proxyAccountId && !walletUtils.isWatchOnly(walletsMap[a.walletId]),
    );

    return proxyAccount && walletsMap[proxyAccount.walletId];
  },
  { skipVoid: false },
);

const $hasProxies = combine($proxiesByChain, (proxiesByChain) => {
  return Object.values(proxiesByChain).some((accounts) => accounts.length > 0);
});

sample({
  source: removeProxy,
  target: $proxyForRemoval,
});

export const walletProviderModel = {
  $accounts,
  $proxiesByChain,
  $hasProxies,
  $singleShardAccount,
  $multiShardAccounts,
  $multisigAccount,
  $vaultAccounts,
  $signatoryContacts,
  $signatoryWallets,
  $proxyWalletForProxied,
  $proxyForRemoval,
  events: {
    removeProxy,
  },
};
