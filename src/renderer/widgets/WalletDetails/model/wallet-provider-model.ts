import uniqBy from 'lodash/uniqBy';
import mapValues from 'lodash/mapValues';
import { combine, createEvent, createStore, sample } from 'effector';

import { accountUtils, permissionUtils, walletModel, walletUtils } from '@entities/wallet';
import { walletSelectModel } from '@features/wallets';
import { dictionary } from '@shared/lib/utils';
import { walletDetailsUtils } from '../lib/utils';
import type { MultishardMap, VaultMap } from '../lib/types';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { networkModel } from '@entities/network';
import { proxiesModel } from '@features/proxies';
import { addProxyModel } from '../../AddProxyModal';
import type {
  BaseAccount,
  Signatory,
  Wallet,
  MultisigAccount,
  AccountId,
  ProxyAccount,
  ProxiedAccount,
  ChainId,
  ProxyGroup,
  Account,
} from '@shared/core';

const removeProxy = createEvent<ProxyAccount>();

const $proxyForRemoval = createStore<ProxyAccount | null>(null);

const $accounts = combine(walletSelectModel.$walletForDetails, (details): Account[] => {
  return details ? details.accounts : [];
});

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

const $canCreateProxy = combine(
  {
    accounts: $accounts,
    wallet: walletSelectModel.$walletForDetails,
  },
  ({ accounts, wallet }) => {
    if (!wallet) return false;

    const canCreateAnyProxy = permissionUtils.canCreateAnyProxy(wallet, accounts);
    const canCreateNonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet, accounts);

    return canCreateAnyProxy || canCreateNonAnyProxy;
  },
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

const $signatoryAccounts = combine(
  {
    walletAccounts: $accounts,
    accounts: walletModel.$accounts,
  },
  ({ walletAccounts, accounts }): Signatory[] => {
    const multisigAccount = walletAccounts[0];
    if (!multisigAccount || !accountUtils.isMultisigAccount(multisigAccount)) return [];

    const accountsMap = dictionary(accounts, 'accountId');

    return multisigAccount.signatories.reduce<Signatory[]>((acc, signatory) => {
      if (accountsMap[signatory.accountId]) {
        acc.push(signatory);
      }

      return acc;
    }, []);
  },
);

const $chainsProxies = combine(
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

    const chainsMap = mapValues(chains, () => []) as Record<ChainId, ProxyAccount[]>;

    return proxyUtils.sortAccountsByProxyType(proxiesForAccounts).reduce((acc, proxy) => {
      acc[proxy.chainId].push(proxy);

      return acc;
    }, chainsMap);
  },
);

const $walletProxyGroups = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    chainsProxies: $chainsProxies,
    groups: proxyModel.$walletsProxyGroups,
  },
  ({ wallet, groups }): ProxyGroup[] => {
    if (!wallet || !groups[wallet.id]) return [];

    // TODO: Find why it can be doubled sometimes https://github.com/novasamatech/nova-spektr/issues/1655
    const walletGroups = groups[wallet.id];
    const filteredGroups = walletGroups.reduceRight((acc, group) => {
      const id = `${group.chainId}_${group.proxiedAccountId}_${group.walletId}`;

      if (!acc[id]) {
        acc[id] = group;
      }

      return acc;
    }, {} as Record<string, ProxyGroup>);

    return Object.values(filteredGroups);
  },
);

const $proxyWallet = combine(
  {
    walletAccounts: $accounts,
    accounts: walletModel.$accounts,
    wallets: walletModel.$wallets,
    detailsWallet: walletSelectModel.$walletForDetails,
  },
  ({ walletAccounts, accounts, wallets, detailsWallet }): Wallet | undefined => {
    if (!walletUtils.isProxied(detailsWallet)) return;

    const walletsMap = dictionary(wallets, 'id');

    const proxyAccount = accounts.find((a) => {
      const isProxyMatch = a.accountId === (walletAccounts[0] as ProxiedAccount).proxyAccountId;
      const isWatchOnly = walletUtils.isWatchOnly(walletsMap[a.walletId]);

      return isProxyMatch && !isWatchOnly;
    });

    return proxyAccount && walletsMap[proxyAccount.walletId];
  },
  { skipVoid: false },
);

const $hasProxies = combine($chainsProxies, (chainsProxies) => {
  return Object.values(chainsProxies).some((accounts) => accounts.length > 0);
});

sample({
  source: removeProxy,
  target: $proxyForRemoval,
});

sample({
  clock: addProxyModel.output.flowFinished,
  target: proxiesModel.events.workerStarted,
});

export const walletProviderModel = {
  $accounts,

  $vaultAccounts,
  $multisigAccount,
  $singleShardAccount,
  $multiShardAccounts,
  $signatoryContacts,
  $signatoryWallets,
  $signatoryAccounts,

  $chainsProxies,
  $walletProxyGroups,
  $proxyWallet,
  $hasProxies,
  $proxyForRemoval,
  $canCreateProxy,
  events: {
    removeProxy,
  },
};
