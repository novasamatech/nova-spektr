import uniqBy from 'lodash/uniqBy';
import mapValues from 'lodash/mapValues';
import { combine, createEvent, createStore, sample } from 'effector';
import { isEmpty } from 'lodash';

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
  AccountId,
  ProxyAccount,
  ChainId,
  ProxyGroup,
  Account,
} from '@shared/core';

const removeProxy = createEvent<ProxyAccount>();

const $proxyForRemoval = createStore<ProxyAccount | null>(null);

const $multiShardAccounts = combine(walletSelectModel.$walletForDetails, (wallet): MultishardMap => {
  if (!wallet || !walletUtils.isMultiShard(wallet)) return new Map();

  return walletDetailsUtils.getMultishardMap(wallet.accounts);
});

const $canCreateProxy = combine(walletSelectModel.$walletForDetails, (wallet) => {
  if (!wallet) return false;

  const canCreateAnyProxy = permissionUtils.canCreateAnyProxy(wallet);
  const canCreateNonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);

  return canCreateAnyProxy || canCreateNonAnyProxy;
});

type VaultAccounts = {
  root: BaseAccount;
  accountsMap: VaultMap;
};
const $vaultAccounts = combine(
  walletSelectModel.$walletForDetails,
  (wallet): VaultAccounts | undefined => {
    if (!wallet || !walletUtils.isMultiShard(wallet)) return undefined;

    const root = accountUtils.getBaseAccount(wallet.accounts);
    const accountsMap = walletDetailsUtils.getVaultAccountsMap(wallet.accounts);

    if (!root || isEmpty(accountsMap)) return undefined;

    return { root, accountsMap };
  },
  { skipVoid: false },
);

const $signatoryContacts = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  ({ wallet, wallets }): Signatory[] => {
    if (!wallet || !walletUtils.isMultisig(wallet)) return [];

    const signatoriesMap = dictionary(wallet.accounts[0].signatories, 'accountId');
    const allSignatories = walletUtils.getAccountsBy(wallets, ({ accountId }) => signatoriesMap[accountId]);
    const uniqueSignatories = uniqBy(allSignatories, 'accountId');

    return wallet.accounts[0].signatories.filter((signatory) => {
      return uniqueSignatories.every((s) => s.accountId !== signatory.accountId);
    });
  },
);

const $signatoryWallets = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  ({ wallet, wallets }): [AccountId, Wallet][] => {
    if (!wallet || !walletUtils.isMultisig(wallet)) return [];

    const signatoriesMap = dictionary(wallet.accounts[0].signatories, 'accountId', () => true);

    const walletsAndAccounts = walletUtils.getWalletsFilteredAccounts(wallets, {
      accountFn: (a) => signatoriesMap[a.accountId],
    });

    if (!walletsAndAccounts) return [];

    return walletsAndAccounts.map((wallet) => [wallet.accounts[0].accountId, wallet]);
  },
);

const $signatoryAccounts = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  ({ wallet, wallets }): Signatory[] => {
    if (!wallet || !walletUtils.isMultisig(wallet)) return [];

    const signatoriesMap = dictionary(wallet.accounts[0].signatories, 'accountId');
    const allSignatories = walletUtils.getAccountsBy(wallets, ({ accountId }) => signatoriesMap[accountId]);
    const uniqueSignatories = uniqBy(allSignatories, 'accountId');

    return wallet.accounts[0].signatories.filter((signatory) => {
      return uniqueSignatories.some((s) => s.accountId === signatory.accountId);
    });
  },
);

const $chainsProxies = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
  },
  ({ wallet, chains, proxies }): Record<ChainId, ProxyAccount[]> => {
    if (!wallet) return {};

    const proxiesForAccounts = uniqBy(wallet.accounts as Account[], 'accountId').reduce<ProxyAccount[]>(
      (acc, account) => {
        if (proxies[account.accountId]) {
          acc.push(...proxies[account.accountId]);
        }

        return acc;
      },
      [],
    );

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
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  ({ wallet, wallets }): Wallet | undefined => {
    if (!wallet || !walletUtils.isProxied(wallet)) return;

    return walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w),
      accountFn: (a) => a.accountId === wallet.accounts[0].proxyAccountId,
    });
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
  $vaultAccounts,
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
