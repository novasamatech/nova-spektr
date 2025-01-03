import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import groupBy from 'lodash/groupBy';

import { storageService } from '@/shared/api/storage';
import { type ID, type NoID, type ProxyAccount, type ProxyGroup } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { proxyUtils } from '../lib/proxy-utils';

type ProxyStore = Record<AccountId, ProxyAccount[]>;

const proxyStarted = createEvent();
const proxiesAdded = createEvent<NoID<ProxyAccount>[]>();
const proxiesRemoved = createEvent<ProxyAccount[]>();

const proxyGroupsAdded = createEvent<NoID<ProxyGroup>[]>();
const proxyGroupsUpdated = createEvent<NoID<ProxyGroup>[]>();
const proxyGroupsRemoved = createEvent<ProxyGroup[]>();

const $proxies = createStore<ProxyStore>({});
const $proxyGroups = createStore<ProxyGroup[]>([]);

const $walletsProxyGroups = combine($proxyGroups, (groups) => {
  return groupBy(groups, 'walletId');
});

const populateProxiesFx = createEffect((): Promise<ProxyAccount[]> => {
  return storageService.proxies.readAll();
});

const addProxiesFx = createEffect((proxies: NoID<ProxyAccount>[]): Promise<ProxyAccount[] | undefined> => {
  return storageService.proxies.createAll(proxies);
});

const removeProxiesFx = createEffect((proxies: ProxyAccount[]): Promise<ID[] | undefined> => {
  return storageService.proxies.deleteAll(proxies.map((p) => p.id));
});

const populateProxyGroupsFx = createEffect((): Promise<ProxyGroup[]> => {
  return storageService.proxyGroups.readAll();
});

const addProxyGroupsFx = createEffect((groups: NoID<ProxyGroup>[]): Promise<ProxyGroup[] | undefined> => {
  return storageService.proxyGroups.createAll(groups);
});

const updateProxyGroupsFx = createEffect((groups: ProxyGroup[]) => {
  return storageService.proxyGroups.updateAll(groups);
});

const removeProxyGroupsFx = createEffect((groups: ProxyGroup[]): Promise<ID[] | undefined> => {
  return storageService.proxyGroups.deleteAll(groups.map((p) => p.id));
});

sample({
  clock: proxyStarted,
  target: [populateProxiesFx, populateProxyGroupsFx],
});

sample({
  clock: populateProxiesFx.doneData,
  fn: (proxies) => groupBy(proxies, 'proxiedAccountId'),
  target: $proxies,
});

sample({
  clock: populateProxyGroupsFx.doneData,
  target: $proxyGroups,
});

sample({
  clock: proxiesAdded,
  filter: (proxiesToAdd) => proxiesToAdd.length > 0,
  target: addProxiesFx,
});

sample({
  clock: addProxiesFx.doneData,
  source: $proxies,
  filter: (_, proxiesToAdd) => Boolean(proxiesToAdd),
  fn: (proxies, proxiesToAdd) => {
    return proxiesToAdd!.reduce<ProxyStore>((acc, proxyAccount) => {
      if (acc[proxyAccount.proxiedAccountId]) {
        acc[proxyAccount.proxiedAccountId].push(proxyAccount);
      } else {
        acc[proxyAccount.proxiedAccountId] = [proxyAccount];
      }

      return acc;
    }, proxies);
  },
  target: $proxies,
});

sample({
  clock: proxiesRemoved,
  filter: (proxiesToRemove) => proxiesToRemove.length > 0,
  target: removeProxiesFx,
});

sample({
  clock: removeProxiesFx.doneData,
  source: $proxies,
  filter: (_, proxiesToRemove) => Boolean(proxiesToRemove),
  fn: (proxies, proxiesToRemove) => {
    return Object.entries(proxies).reduce<ProxyStore>((acc, entry) => {
      const [accountId, proxyAccounts] = entry as [AccountId, ProxyAccount[]];

      const filteredProxyAccounts = proxyAccounts.filter((proxyAccount) => !proxiesToRemove!.includes(proxyAccount.id));
      if (filteredProxyAccounts.length) {
        acc[accountId] = filteredProxyAccounts;
      }

      return acc;
    }, {});
  },
  target: $proxies,
});

sample({
  clock: proxyGroupsAdded,
  target: addProxyGroupsFx,
});

sample({
  clock: addProxyGroupsFx.doneData,
  source: $proxyGroups,
  filter: (_, newProxyGroups) => Boolean(newProxyGroups) && newProxyGroups!.length > 0,
  fn: (groups, newProxyGroups) => {
    return groups.concat(newProxyGroups!);
  },
  target: $proxyGroups,
});

sample({
  clock: proxyGroupsUpdated,
  source: $proxyGroups,
  filter: (_, proxyGroups) => Boolean(proxyGroups),
  fn: (groups, proxyGroups) => {
    return proxyGroups.reduce<ProxyGroup[]>((acc, g) => {
      const group = groups.find((p) => proxyUtils.isSameProxyGroup(p, g));
      if (group) {
        acc.push(group);
      }

      return acc;
    }, []);
  },
  target: updateProxyGroupsFx,
});

sample({
  clock: updateProxyGroupsFx.done,
  source: $proxyGroups,
  filter: (_, { params: proxyGroups }) => Boolean(proxyGroups),
  fn: (groups, { params: proxyGroups }) => {
    return groups
      .filter((g) => {
        return !proxyGroups!.some((p) => proxyUtils.isSameProxyGroup(g, p));
      })
      .concat(proxyGroups);
  },
  target: $proxyGroups,
});

sample({
  clock: proxyGroupsRemoved,
  target: removeProxyGroupsFx,
});

sample({
  clock: removeProxyGroupsFx.doneData,
  source: $proxyGroups,
  filter: (_, proxyGroups) => Boolean(proxyGroups),
  fn: (groups, proxyGroups) => {
    const proxySet = new Set(proxyGroups);

    return groups.filter((g) => !proxySet.has(g.id));
  },
  target: $proxyGroups,
});

export const proxyModel = {
  $proxies,
  $proxyGroups,
  $walletsProxyGroups,
  events: {
    proxyStarted,
    proxiesAdded,
    proxiesRemoved,

    proxyGroupsAdded,
    proxyGroupsUpdated,
    proxyGroupsRemoved,
  },
};
