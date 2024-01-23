import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import groupBy from 'lodash/groupBy';

import { proxyUtils } from '../lib/utils';
import { type ProxyAccount, AccountId, ProxyGroup, NoID } from '@shared/core';
import { storageService } from '@shared/api/storage';

type ProxyStore = Record<AccountId, ProxyAccount[]>;

const $proxies = createStore<ProxyStore>({});
const $proxyGroups = createStore<ProxyGroup[]>([]);

const $walletsProxyGroups = combine($proxyGroups, (groups) => {
  return groupBy(groups, 'walletId');
});

const proxyStarted = createEvent();
const proxiesAdded = createEvent<ProxyAccount[]>();
const proxiesRemoved = createEvent<ProxyAccount[]>();

const proxyGroupsAdded = createEvent<NoID<ProxyGroup>[]>();
const proxyGroupsUpdated = createEvent<NoID<ProxyGroup>[]>();
const proxyGroupsRemoved = createEvent<ProxyGroup[]>();

const populateProxiesFx = createEffect((): Promise<ProxyAccount[]> => {
  return storageService.proxies.readAll();
});

const addProxiesFx = createEffect((proxies: ProxyAccount[]): Promise<ProxyAccount[] | undefined> => {
  return storageService.proxies.createAll(proxies);
});

const removeProxiesFx = createEffect((proxies: ProxyAccount[]) => {
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

const removeProxyGroupsFx = createEffect((groups: ProxyGroup[]) => {
  return storageService.proxyGroups.deleteAll(groups.map((p) => p.id));
});

sample({
  clock: proxyStarted,
  target: [populateProxiesFx, populateProxyGroupsFx],
});

sample({
  clock: populateProxiesFx.doneData,
  fn: (proxies) => groupBy(proxies, 'accountId'),
  target: $proxies,
});

sample({
  clock: populateProxyGroupsFx.doneData,
  target: $proxyGroups,
});

sample({
  clock: proxiesAdded,
  source: $proxies,
  filter: (_, proxiesToAdd) => proxiesToAdd.length > 0,
  fn: (proxies, proxiesToAdd) => {
    return proxiesToAdd.reduce<ProxyStore>((acc, proxyAccount) => {
      acc[proxyAccount.proxiedAccountId] = (acc[proxyAccount.proxiedAccountId] || []).concat(proxyAccount);

      return acc;
    }, proxies);
  },
  target: $proxies,
});

sample({ clock: proxiesAdded, target: addProxiesFx });

sample({
  clock: proxiesRemoved,
  source: $proxies,
  filter: (_, proxiesToRemove) => proxiesToRemove.length > 0,
  fn: (proxies, proxiesToRemove) => {
    return proxiesToRemove.reduce<ProxyStore>((acc, proxyAccount) => {
      acc[proxyAccount.proxiedAccountId] = acc[proxyAccount.proxiedAccountId]?.filter(
        (account) => !proxyUtils.isSameProxy(account, proxyAccount),
      );

      if (acc[proxyAccount.proxiedAccountId].length === 0) {
        delete acc[proxyAccount.proxiedAccountId];
      }

      return acc;
    }, proxies);
  },
  target: $proxies, // TODO: update $proxies after effect
});

sample({ clock: proxiesRemoved, target: removeProxiesFx });

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
