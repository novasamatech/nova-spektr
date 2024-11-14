import { combine, createEvent, createStore, sample } from 'effector';
import { isEmpty } from 'lodash';
import mapValues from 'lodash/mapValues';
import uniqBy from 'lodash/uniqBy';

import {
  type AccountId,
  type BaseAccount,
  type ChainId,
  type Contact,
  type ProxyAccount,
  type ProxyGroup,
  type Wallet,
} from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { accountUtils, permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelectModel } from '@/features/wallets';
import { type MultishardMap, type VaultMap } from '../lib/types';
import { walletDetailsUtils } from '../lib/utils';

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
    if (!wallet || !walletUtils.isPolkadotVault(wallet)) return undefined;

    const root = accountUtils.getBaseAccount(wallet.accounts);
    const accountsMap = walletDetailsUtils.getVaultAccountsMap(wallet.accounts);

    if (!root || isEmpty(accountsMap)) return undefined;

    return { root, accountsMap };
  },
  { skipVoid: false },
);

const $signatories = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
    contacts: contactModel.$contacts,
  },
  ({ wallet, wallets, contacts }): { wallets: [Wallet, AccountId][]; contacts: Contact[]; people: AccountId[] } => {
    if (!wallet || !walletUtils.isMultisig(wallet)) {
      return { wallets: [], contacts: [], people: [] };
    }

    const signatoriesMap = dictionary(wallet.accounts[0].signatories, 'accountId', true);

    const walletSignatories: [Wallet, AccountId][] = [];
    for (const wallet of wallets) {
      if (walletUtils.isWatchOnly(wallet)) continue;

      for (const account of wallet.accounts) {
        if (!signatoriesMap[account.accountId]) continue;

        delete signatoriesMap[account.accountId];
        walletSignatories.push([wallet, account.accountId]);
      }
    }

    const contactSignatories: Contact[] = [];
    for (const contact of contacts) {
      if (!signatoriesMap[contact.accountId]) continue;

      contactSignatories.push(contact);
      delete signatoriesMap[contact.accountId];
    }

    return {
      wallets: walletSignatories,
      contacts: contactSignatories,
      people: Object.keys(signatoriesMap) as AccountId[],
    };
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

    const proxiesForAccounts = uniqBy(wallet.accounts, 'accountId').reduce<ProxyAccount[]>((acc, account) => {
      if (proxies[account.accountId]) {
        acc.push(...proxies[account.accountId]);
      }

      return acc;
    }, []);

    const chainsMap = mapValues(chains, () => []) as Record<ChainId, ProxyAccount[]>;

    return proxyUtils.sortAccountsByProxyType(proxiesForAccounts).reduce((acc, proxy) => {
      if (acc[proxy.chainId]) {
        acc[proxy.chainId].push(proxy);
      }

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
    const filteredGroups = walletGroups.reduceRight(
      (acc, group) => {
        const id = `${group.chainId}_${group.proxiedAccountId}_${group.walletId}`;

        if (!acc[id]) {
          acc[id] = group;
        }

        return acc;
      },
      {} as Record<string, ProxyGroup>,
    );

    return Object.values(filteredGroups);
  },
);

const $proxyWallet = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  ({ wallet, wallets }): Wallet | null => {
    if (!wallet || !walletUtils.isProxied(wallet)) return null;

    return walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w),
      accountFn: (a) => a.accountId === wallet.accounts[0].proxyAccountId,
    });
  },
);

const $hasProxies = combine($chainsProxies, (chainsProxies) => {
  return Object.values(chainsProxies).some((accounts) => accounts.length > 0);
});

sample({
  source: removeProxy,
  target: $proxyForRemoval,
});

export const walletProviderModel = {
  $vaultAccounts,
  $multiShardAccounts,
  $signatories,

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
